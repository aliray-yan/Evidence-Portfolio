# MANUAL — verifying and running what this sandbox couldn't

This sandbox has no route to nuget.org or Maven Central, no Docker, and no installable Kafka broker. Everything below is written and believed correct (standard, well-worn patterns throughout), but genuinely untested past that point. This file is the single place for exactly what to install and run to close that gap — component READMEs just point here now instead of repeating it.

## Install once

| Tool | Needed for | Get it |
|---|---|---|
| .NET 8 SDK | legacy-monolith, gateway, order-service | https://dotnet.microsoft.com/download/dotnet/8.0 |
| JDK 21 + Maven | customer-service | https://adoptium.net (JDK), https://maven.apache.org (Maven) |
| Docker + Docker Compose | Kafka, running everything together | https://www.docker.com/products/docker-desktop |
| Python 3.10+ | data-migrator, notification-service | usually preinstalled on macOS/Linux; https://www.python.org/downloads for Windows |
| `dotnet-ef` CLI tool | migrations for the three .NET services | `dotnet tool install --global dotnet-ef` |

## legacy-monolith

1. `cd legacy-monolith && dotnet restore && dotnet build` — the real check on this file set. Send back any error.
2. `docker compose up legacy-db` (repo root) — starts Postgres.
3. `dotnet ef migrations add InitialCreate && dotnet ef database update`
4. `dotnet run` — listens on `http://localhost:5000` (see `Properties/launchSettings.json`).
5. Confirm: open `http://localhost:5000/swagger`, all six controllers listed.

## customer-service

1. `cd services/customer-service && mvn clean package` — pulls Spring Boot, Postgres driver, Lombok, compiles.
2. `docker compose up customer-db`
3. `mvn spring-boot:run -Dspring-boot.run.profiles=local` — runs against `localhost:5433`.
4. Confirm: `curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`.

## order-service

1. `cd services/order-service && dotnet restore && dotnet build`
2. `docker compose up order-db`
3. `dotnet ef migrations add InitialCreate && dotnet ef database update`
4. `dotnet run` — listens on `http://localhost:5001`.
5. Confirm: `curl http://localhost:5001/health`.

## gateway

Already built, run, and live-tested in the sandbox — nothing to do here. If you want to extend it, `dotnet build` inside `gateway/` works with zero setup since it has no external packages.

## data-migrator

Already live-tested against real seeded Postgres for both scripts. To re-run against your own data: `pip install -r migration/data-migrator/requirements.txt`, then see `migration/data-migrator/README.md` for the exact commands.

## inventory-service

1. `cd services/inventory-service && mvn clean package`
2. `docker compose up inventory-db kafka`
3. `mvn spring-boot:run -Dspring-boot.run.profiles=local` — runs against `localhost:5435`, listens on `8083`, consumes Kafka at `localhost:9094`.
4. Confirm the REST API: `curl http://localhost:8083/actuator/health`.
5. Confirm the Kafka consumer actually works: with `order-service` and `kafka` also running (see the Kafka section below), create a product via `POST /api/inventory` with a `sku` that matches an order you're about to place, then create that order through `order-service`. Within a couple seconds, `GET /api/inventory/sku/{sku}` should show `quantityReserved` incremented and `available` decreased — check the inventory-service logs for a line starting `Reserved N units of`.

## Testing (Phase 12)

Already genuinely run here: `migration/data-migrator/tests/` (17 tests) and `services/notification-service/tests/` (3 tests) — both `pip install -r requirements.txt --break-system-packages && pytest tests/ -v` and they'll pass the same way locally.

What needs your machine:
1. `cd legacy-monolith/Tests && dotnet test` — xUnit + WebApplicationFactory, needs NuGet.
2. `cd services/customer-service && mvn test` — JUnit + MockMvc, needs Maven Central.
3. Load testing: `k6` (https://k6.io/docs/get-started/installation) installed locally, then with the full stack up (`docker compose up`):
   ```
   k6 run -e TARGET_URL=http://localhost:8080/api/customers -e VUS=100 -e DURATION=30s tests/load/load_test.js
   ```
   Repeat at `VUS=500` and `VUS=1000`, and toggle `PUT /admin/routing/customer {"mode":"modern"}` between runs to compare legacy vs modern. See `docs/architecture/load-testing.md` for what to expect and why the one result captured in the sandbox is limited to a single VU tier.

## Dashboard (Phase 11)

`npm install` and `npm run build` were already run for real (see `dashboard/README.md`) — what's left is the part that needs an actual browser:

1. `docker compose up dashboard gateway legacy-monolith legacy-db` (plus `.env` filled in per the Security section above).
2. Open `http://localhost:3001` in a real browser. Log in as `migrator` (or whatever `MIGRATION_ENGINEER_USERNAME` you set).
3. Confirm all three domains show `legacy`, click "Cut over to modern" on one — should flip to `modern` within the 5-second poll, and match what `curl http://localhost:8080/admin/routing` shows directly.
4. Log out, log back in as the OPERATOR account — confirm the buttons are disabled and the hint text explains why, and confirm there's no audit log section (ADMIN only).
5. Log in as ADMIN, confirm the audit log shows the change from step 3.

## Security (Phase 10)

The gateway's auth was fully live-tested already (see `docs/architecture/security.md`), so there's nothing left to independently verify here beyond confirming it works the same way through Docker:

1. Copy `.env.example` to `.env` and fill in `JWT_SECRET` (e.g. `openssl rand -base64 32`), `ADMIN_PASSWORD`, `MIGRATION_ENGINEER_PASSWORD`, `OPERATOR_PASSWORD`.
2. `docker compose up gateway legacy-monolith legacy-db` — if any required var is missing, compose fails immediately with a clear message rather than starting with a bad default.
3. `curl -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"<your ADMIN_PASSWORD>"}'` — should return a token.
4. `curl -X PUT http://localhost:8080/admin/routing/customer -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"mode":"modern"}'` — should return 200.
5. `curl http://localhost:8080/admin/audit-log -H "Authorization: Bearer <token>"` — should show the change from step 4.

## Observability stack (Phase 9)

1. `docker compose up prometheus grafana loki gateway legacy-monolith customer-service order-service inventory-service` (plus their DBs and Kafka).
2. Open `http://localhost:9090/targets` — confirm all four scrape targets (gateway, customer-service, inventory-service, order-service) show as `UP`. If any show `DOWN`, that service's `/metrics` or `/actuator/prometheus` endpoint isn't responding — check that service's own logs.
3. Open `http://localhost:3000` (Grafana, anonymous admin access is enabled for local use) — under Connections → Data sources, confirm Prometheus and Loki both show green "Data source is working."
4. Hit a few endpoints through the gateway (`curl http://localhost:8080/api/customers`, etc.), then `curl http://localhost:8080/metrics` — confirm request counts reflect what you just did.
5. Confirm correlation IDs actually propagate: `curl -D - http://localhost:8080/api/orders` and note the `X-Correlation-Id` in the response, then check `order-service`'s container logs (`docker compose logs order-service`) for a `trace correlationId=<that same ID>` line.

What was already verified without Docker: the gateway's correlation ID generation/propagation and its `/metrics` output — both genuinely run in the sandbox that wrote this, see `docs/architecture/observability.md`.

## Kafka + notification-service (Phase 6)

Nothing here runs without Docker — Kafka specifically has no non-Docker install path covered above.

1. `docker compose up kafka` — wait until `docker compose ps` shows it healthy.
2. `docker compose up order-db order-service` — Order Service's `dotnet restore` now also needs to pull `Confluent.Kafka`; same NuGet caveat as everywhere else in this service.
3. `cd services/notification-service && pip install -r requirements.txt && python notification_service.py` — starts consuming `legacyx.orders`. Leave it running.
4. In another terminal, create an order:
   ```
   curl -X POST http://localhost:8082/api/orders -H "Content-Type: application/json" \
     -d '{"customerNo":"C001","items":[{"sku":"SKU-001","quantity":2,"unitPrice":19.99}]}'
   ```
5. Confirm: within ~2 seconds (the outbox publisher's poll interval), the notification-service terminal logs a line starting `[SIMULATED NOTIFICATION]`.

What *was* verified without Docker: the consumer's event-handling logic itself, decoupled from the Kafka connection — `cd services/notification-service && python test_handle_event.py`, no broker needed. See that file before assuming the whole thing is a guess.

## Aviation expansion — not covered by the sections above

Everything above this point predates the aviation expansion (`AVIATION-EXPANSION-HANDOFF.md`) and still applies to `customer-service`/`order-service`/`inventory-service` as written. The six aviation services (`passenger-service`, `flight-scheduling-service` — JDK 21 + Maven, same pattern as `customer-service` above; `fleet-service`, `crew-service` — Python 3.10+/FastAPI, `pip install -r requirements.txt` then `uvicorn main:app`; `booking-service`, `baggage-service` — .NET 8, same pattern as `order-service` above) don't have their own walkthrough here yet — this section covers only what changed in the session that resumed after this handoff, which is the part least verified: two fixes written and reasoned through in a sandbox with a JRE but no `javac`, `mvn`, or Maven Central access, so unlike everything else this session touched (FastAPI, the dashboard's `tsc`/`next build`), neither one has actually been compiled.

1. **The 400-not-500 fix, all four Spring services** (`customer-service`, `inventory-service`, `passenger-service`, `flight-scheduling-service` — identical `GlobalExceptionHandler.java` in each): `mvn clean package` in each, then with the service running, `curl -i -X POST http://localhost:PORT/api/.../whatever -H "Content-Type: application/json" -d '{malformed'` (unterminated JSON, or any body that fails to deserialize). Expect `400` with `{"error": "Malformed or unreadable request body."}` — if you see `500`, the new `@ExceptionHandler(HttpMessageNotReadableException.class)` isn't shadowing `handleGeneric(Exception)` the way it's meant to.
2. **passenger-service's `dateOfBirth`** (`PassengerRequests.java`): once `passenger-service` is running, `POST /api/aviation/passengers` with a real `fullName`/`passportNumber`/`nationality` and:
   - `dateOfBirth` omitted entirely → expect `400` (was previously `201` with a null DOB persisted).
   - `"dateOfBirth": "1990-01-01T00:00:00Z"` → expect `400` (was previously `201`, silently truncated to `1990-01-01`).
   - `"dateOfBirth": "1990-01-01T00:00:00+05:00"` → expect `400` (was previously `500`).
   - `"dateOfBirth": "1990-01-01"` → expect `201`, unaffected — confirms the fix didn't over-tighten the actually-valid case.

The reasoning behind both (Jackson's `LocalDateDeserializer` special-casing a `T` at index 10 instead of rejecting it; `@ExceptionHandler(Exception.class)` shadowing a more specific exception type it should defer to) is standard, well-documented Jackson/Spring behavior, not a guess — but standard behavior is still worth the four curls above before trusting it.

## General troubleshooting

- Any `dotnet restore`/`build` failure that isn't a NuGet network error is genuinely mine — send it back with the full error.
- Any `mvn` failure that isn't a Maven Central network error, same thing.
- Port conflicts: this repo's local-dev ports are 5000 (monolith), 5001 (order-service), 5433/5434 (customer-db/order-db, monolith's own DB is 5432), 7000 (gateway), 8080 (customer-service). If something else on your machine already uses one of these, override via the relevant `appsettings.Development.json` / `application-local.yml` / `launchSettings.json`.
