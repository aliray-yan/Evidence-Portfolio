# customer-service

Spring Boot 3, Java 21. The one domain extracted from the legacy monolith in v1 — owns customer creation, retrieval, update, and delete, backed by its own database (`customer_db`). Doesn't know the legacy database exists; only the gateway and the migration script (Phase 5) bridge the two.

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/api/customers` | List all |
| GET | `/api/customers/{id}` | Get one |
| POST | `/api/customers` | Create — 409 if `customerNo` already exists |
| PUT | `/api/customers/{id}` | Update name/status/email/phone |
| DELETE | `/api/customers/{id}` | Delete |
| GET | `/actuator/health` | Health check (Spring Boot Actuator, not hand-rolled) |

## Field mapping (the anti-corruption layer in practice)

| Legacy (`legacy-monolith`) | Modern (here) |
|---|---|
| `CustomerNo` | `customerNo` — kept, not renamed. It's the legacy business key, preserved on purpose so Phase 5's migration can match records across both databases. |
| `CustomerName` | `fullName` |
| `CustStatus` (`"A"`/`"I"`) | `status` (`"ACTIVE"`/`"INACTIVE"`) |
| `Id` (int, internal PK) | `id` (Long, internal PK) — **not** the same value as legacy's `Id`. See the known limitation below. |

## Known limitation: cross-domain customer references

Orders stay on the legacy monolith in v1, and `OrdersController` checks a new order's `CustomerId` against `legacy_db.customers` directly. Once Customer is cut over to modern, *new* customers are created in `customer_db`, not `legacy_db` — so an order referencing a customer created after cutover would fail that check. Existing (already-migrated) customers aren't affected, since Phase 5's migration copies them into `legacy_db` too rather than moving them.

This is a real strangler-fig problem, not an oversight: fully solving it means either extracting Orders too, having Orders check both databases, or syncing new customer records back to legacy — all reasonable, all out of scope for v1. Flagged in `docs/roadmap.md` rather than silently ignored.

## Verifying this yourself

See `../../MANUAL.md` — "customer-service" section has the exact commands.


## Running it

```
docker compose up customer-db customer-service
```
Or bring up the whole v1 stack so far: `docker compose up`.
