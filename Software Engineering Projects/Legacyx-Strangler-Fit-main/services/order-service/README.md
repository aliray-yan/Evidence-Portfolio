# order-service

ASP.NET Core 8, own database (`order_db`). Phase 5 — the second domain extracted from the legacy monolith.

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/api/orders` | List all, or `?customerNo=C001` for one customer's order history |
| GET | `/api/orders/{id}` | Get one, with items |
| POST | `/api/orders` | Create |
| PUT | `/api/orders/{id}/status` | Update status |
| POST | `/api/orders/{id}/cancel` | Cancel — refuses if already `SHIPPED` |
| GET | `/health` | Health check |

## Design decision: business keys, not internal IDs

`Order.CustomerNo` is a string (e.g. `"C001"`), not a numeric `CustomerId`. `OrderItem.Sku` is a string, not a numeric `ProductId`. Both are deliberate, and both follow the same reasoning as Customer Service's `customerNo`: internal database IDs are specific to whichever system currently owns that domain, but a business key (`customerNo`, `sku`) stays valid whether the domain lives in the legacy monolith or has been extracted. This is what let Order Service reference customers correctly *before* deciding whether Customer is on legacy or modern — and it'll do the same for Inventory once Phase 7 extracts it.

## Known gap: no live validation on create

`POST /api/orders` checks that `customerNo` isn't blank, but doesn't check it actually exists anywhere. The correct fix is for Order Service to ask the **gateway** to resolve it — the gateway is the one thing that already knows whether a given customer currently lives in `legacy_db` or `customer_db`, so it's the natural single source of truth rather than Order Service guessing or checking both databases itself. Not built yet: it's a cross-service HTTP call plus a new gateway lookup-by-`customerNo` endpoint, and this phase was big enough without it. Tracked in `docs/roadmap.md`.

## Verifying this yourself

See `../../MANUAL.md` — "order-service" section has the exact commands.


## Running it

```
docker compose up order-db order-service
```
Now wired into the gateway — `PUT /admin/routing/order {"mode":"modern"}` against the gateway routes `/api/orders` traffic here. Migrate existing orders with `docker compose run --rm order-migrator` once this service's schema exists (see `migration/data-migrator/README.md` — the migration was verified with real foreign-key resolution from legacy `CustomerId`/`ProductId` to `customerNo`/`sku`).
