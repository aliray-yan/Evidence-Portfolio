# inventory-service

Spring Boot 3, Java 21. Phase 7 — the third domain extracted, and the second Kafka consumer alongside `notification-service`. Owns product inventory, stock levels, reservation, and release, backed by its own database (`inventory_db`).

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/api/inventory` | List all products |
| GET | `/api/inventory/{id}` | Get one |
| GET | `/api/inventory/sku/{sku}` | Get one by SKU |
| POST | `/api/inventory` | Create — 409 if `sku` already exists |
| POST | `/api/inventory/{id}/reserve` | `{"quantity": N}` — 409 if not enough available |
| POST | `/api/inventory/{id}/release` | `{"quantity": N}` |
| GET | `/actuator/health` | Health check |

Every product response includes a computed `available` field (`quantityOnHand - quantityReserved`) — not stored, just a getter Jackson picks up automatically.

## Reacts to OrderCreated

`OrderEventListener` consumes `legacyx.orders` and auto-reserves stock for each line item when a new order comes in — the same event Order Service publishes for `notification-service`, with no changes to Order Service and no coordination between the two consumers. This is the actual point of the outbox/Kafka work in Phase 6: Order Service has zero knowledge Inventory Service exists.

If an event references a `sku` this service doesn't recognize, it logs a warning and moves on rather than failing the whole message — a real production system would likely route this to a dead-letter topic instead; not built here, noted as a gap rather than pretended away.

## Verifying this yourself

See `../../MANUAL.md` — "inventory-service" section has the exact commands, including how to confirm the Kafka listener actually reserves stock when an order comes in.

## Running it

```
docker compose up inventory-db inventory-service
```
Wired into the gateway — `PUT /admin/routing/inventory {"mode":"modern"}` routes `/api/inventory` traffic here. Migrate existing products with `docker compose run --rm inventory-migrator` once this service's schema exists.
