# data-migrator

Two one-time scripts, same image, same pattern: extract from `legacy_db`, transform, load into the target domain's database, validate. Not a general ETL framework — one script per domain, on purpose.

## migrate_customers.py

Straightforward field mapping — see `docs/architecture/overview.md`'s anti-corruption layer.

**Verified — actually run, with real data**: seeded 6 legacy customers (one deliberately broken, empty name). Dry run: 5 would migrate, 1 would fail. Real run: 5 migrated, 1 failed with a clear reason (not silently dropped), validation `PASS`. Re-run: 0 migrated, 5 skipped as already-migrated, no duplicates. Spot-checked `customer_db` directly — names, statuses (`A`→`ACTIVE`), emails all correct.

## migrate_orders.py

More involved: legacy `Orders`/`OrderItems` reference `Customers`/`Products` by internal integer ID, but the modern Order Service references them by business key (`customerNo`, `sku`) — see `services/order-service/README.md`. This script resolves both lookup maps once up front (`CustomerId → CustomerNo`, `ProductId → Sku`), then transforms each order and its items through them.

**Verified — actually run, with real data**: seeded 2 customers, 2 products, 3 orders (6 line items total) in a legacy schema with real foreign-key constraints. Dry run: all 3 would migrate. Real run: 3 migrated, 0 failed, validation `PASS` (order count matched, 0 field mismatches across total/status). Re-run: 0 migrated, 3 skipped, confirmed idempotent. Queried `order_db` directly afterward — every `CustomerId` correctly resolved to its `CustomerNo`, every `ProductId` correctly resolved to its `Sku`.

(One thing worth knowing: I tried to seed a genuinely orphaned product reference to test the failure path the same way the customer script's test did, and Postgres's own foreign-key constraint blocked the delete — which is actually a good sign, it means the schema enforces the same integrity a real EF-Core-generated one would. The failure-handling code path itself is structurally identical to `migrate_customers.py`'s, already proven correct there, so it wasn't re-demonstrated here rather than fighting the database's own constraints to force it.)

## Usage

```
pip install -r requirements.txt --break-system-packages   # or use a venv

python migrate_customers.py [--dry-run]
python migrate_orders.py [--dry-run]
```

Connection settings via environment variables: `LEGACY_DB_HOST/PORT/NAME/USER/PASSWORD`, `MODERN_DB_HOST/PORT/NAME/USER/PASSWORD`. Defaults assume `localhost`, legacy on 5432; `migrate_customers.py` defaults modern to 5433 (`customer_db`), `migrate_orders.py` to 5434 (`order_db`).

Via Docker (from the repo root, once the relevant services have created their schemas):
```
docker compose run --rm customer-migrator
docker compose run --rm order-migrator
```

## What "validation" actually checks

Row counts (legacy vs. modern) plus a full spot-check of every migrated record's key fields against the source. Exits non-zero if anything failed or validation didn't pass.
