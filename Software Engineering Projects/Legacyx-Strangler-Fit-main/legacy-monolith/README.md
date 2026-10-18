# legacy-monolith

ASP.NET Core 8 Web API, one PostgreSQL database (`legacy_db`), six domains sharing it directly — that direct sharing is the coupling this whole project exists to fix.

## Domains

| Domain | Endpoints |
|---|---|
| Customers | `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/{id}` |
| Orders | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PUT /api/orders/{id}/status`, `POST /api/orders/{id}/cancel` |
| Inventory | `GET/POST /api/inventory`, `GET /api/inventory/{id}`, `POST /api/inventory/{id}/reserve`, `POST /api/inventory/{id}/release` |
| Payments | `POST /api/payments`, `GET /api/payments/{id}`, `GET /api/payments/order/{orderId}` — simulated only |
| Notifications | `GET/POST /api/notifications` — simulated delivery, logged not sent |
| Reports | `GET /api/reports/summary` |

Plus `GET /health`.

Customer is the one domain that will get extracted to `services/customer-service` later in v1. Everything else stays here permanently — see `../docs/roadmap.md`.

## Verifying this yourself

See `../MANUAL.md` — "legacy-monolith" section has the exact commands.


## Running it

```
docker compose up legacy-db legacy-monolith
```
