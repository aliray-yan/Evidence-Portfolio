# Data architecture

## Database-per-service, in full

| Database | Owned by | Key tables |
|---|---|---|
| `legacy_db` | legacy-monolith | `Customers`, `Orders`, `OrderItems`, `Products`, `Payments`, `Notifications` — all six domains' tables, still all present even though three are no longer the source of truth once cut over |
| `customer_db` | customer-service | `customers` |
| `order_db` | order-service | `Orders`, `OrderItems`, `OutboxMessages` |
| `inventory_db` | inventory-service | `products` |

No service queries another's database directly — not even legacy-monolith reaching into `customer_db`, or vice versa. Every cross-domain need goes through an API call (gateway-forwarded) or a Kafka event.

## Naming convention differences, and why they're not a bug

`legacy_db` and `order_db` use PascalCase, quoted-identifier table/column names (`"Orders"`, `"CustomerNo"`) — EF Core's default Npgsql convention. `customer_db` and `inventory_db` use lowercase snake_case (`customers`, `customer_no`) — Hibernate's default. This looks inconsistent at a glance but is simply each ORM's own default left alone rather than fought — the migration scripts (`migration/data-migrator/`) are exactly where this difference has to be handled explicitly, and each script's SQL is written for its specific target's actual convention (verified live against real schemas of both shapes — see each script's test results in `migration/data-migrator/README.md`).

## The anti-corruption layer, summarized in one place

| Legacy field | Modern field | Domain |
|---|---|---|
| `CustomerNo` | `customerNo` (kept, not renamed — see below) | Customer |
| `CustomerName` | `fullName` | Customer |
| `CustStatus` (`"A"`/`"I"`) | `status` (`"ACTIVE"`/`"INACTIVE"`) | Customer |
| `CustomerId` (int FK) | `customerNo` (string business key) | Order → Customer reference |
| `ProductId` (int FK) | `sku` (string business key) | Order → Inventory reference |
| `Sku` | `sku` (unchanged — was already a clean business key) | Inventory |

Full reasoning for each row: `overview.md` (Customer), `services/order-service/README.md` (Order's business-key references), `services/inventory-service/README.md` (why Inventory needed less translation).

## Migration data flow

```
legacy_db.Customers  ──migrate_customers.py──▶  customer_db.customers
legacy_db.Orders      ──migrate_orders.py─────▶  order_db.Orders
  (resolves CustomerId→customerNo, ProductId→sku via lookup maps built from legacy_db)
legacy_db.Products    ──migrate_inventory.py──▶  inventory_db.products
```

All three: one-time, idempotent (safe to re-run — verified live, see `migration/data-migrator/README.md`), validated after running (row counts + field-level spot-checks), and none of them delete the source data — `legacy_db` keeps every row even after a domain's been migrated and cut over, which is what makes rollback safe.

## What's not built

No backup/restore tooling for any of the four databases, no automated schema-migration versioning shared across services (each service manages its own EF Core/Hibernate migrations independently, with no cross-service coordination), and no data-consistency checking *after* the initial migration — if `legacy_db` and `customer_db` drift apart post-cutover (the known limitation in `services/order-service/README.md` about new customers not being visible to legacy Orders), nothing detects that automatically.
