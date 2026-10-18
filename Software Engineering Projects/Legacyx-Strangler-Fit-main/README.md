# LegacyX

A multi-tenant Strangler Fig legacy-modernization platform — built to demonstrate how a real enterprise incrementally replaces a legacy monolith without a big-bang rewrite, and how that same pattern scales to a second, completely unrelated industry running on the same platform.

## The problem

A fictional 15-year-old application handles customers, orders, and inventory in one tightly-coupled monolith: shared database, shared models, one deployment unit. The organization can't take it offline and can't safely rewrite it in one pass. So instead, functionality gets extracted one piece at a time behind a gateway that can route traffic to either the old system or the new one — with a way back if something breaks.

LegacyX builds that, twice over: a **retail** tenant (the original demo — Customer, Order, Inventory) fully migrated behind a legacy/modern toggle, and an **aviation** tenant (Passenger & Loyalty, Fleet & Maintenance, Flight Scheduling, Booking & Ticketing, Crew Management, Baggage & Freight) added later to prove the platform is genuinely multi-tenant, not retail-shaped. Both tenants share one gateway, one JWT scheme, and zero data leakage between them — a cross-tenant request is rejected and logged, not just refused.

## Status

**Retail tenant: complete.** Full Strangler Fig loop — legacy monolith, three extracted services, gateway-mediated cutover/rollback per domain, event-driven decoupling via Kafka, real data migration, observability, and a dashboard. Every piece has been built, run in Docker, and verified live against the running stack, including a full security hardening pass (see below).

**Aviation tenant: extracted services complete, legacy mirror not yet built.** All six aviation domains exist as working, extracted microservices with their own databases, and the platform correctly treats them as a second tenant — separate JWT roles, separate audit trail, cross-tenant access blocked at the gateway. What aviation does **not** yet have is what retail has: a working legacy-side implementation to route *back* to, and the admin cutover UI that goes with it. The aviation tables were seeded into the legacy monolith to represent the "before" state, but no REST API was built on top of them — so right now aviation traffic only has one real backend (the extracted services), not two. Building the legacy mirror and the toggle is the next planned phase.

## What's been verified, live

Every claim below was watched working against the real running stack, not just written — including a mid-project sandbox migration from "no Docker access" to a fully containerized, live-tested build.

- **Gateway** — routing across all domains (both tenants), a circuit breaker watched opening and recovering against a real killed-and-restarted backend, JWT auth + RBAC tested through full login→action→audit flows for both tenants, cross-tenant 403s confirmed on both the admin surface and business API, correlation IDs, Prometheus metrics, per-IP rate limiting.
- **All extracted services**, retail and aviation — real CRUD against real Postgres, real validation rejecting malformed input, mass-assignment protections confirmed by trying to smuggle server-managed fields through the API and watching them get ignored.
- **Both Kafka event chains** — `OrderCreated` (retail) and `TicketIssuedEvent`/`FlightDepartedEvent` (aviation) traced end to end: an order/booking placed on one service silently updates state in a completely independent service seconds later, with the exact numbers checked (a $420.50 fare credits precisely 2,102 loyalty miles; a flight departure adds exactly 1.5 logged duty hours per assigned crew member).
- **The dashboard** — tenant-aware workspace switching confirmed live in-browser: the same login page routes a retail admin and an aviation FlightDispatcher to two entirely different navigation trees and widget sets, with role-appropriate buttons enabled/disabled correctly in each.
- **Data migrators**, **pytest suites**, **xUnit/JUnit suites** — all run for real, not just written.
- **A full 20-point security audit**, run in parallel across every service and language, with every real finding fixed and re-verified — see `docs/architecture/security.md` and the details below.

## Security

A dedicated hardening pass covered authentication, authorization, injection, XSS/CSRF, rate limiting, headers, CORS, secrets handling, error handling, and container/database hardening across all seven original services (later applied to the six aviation services as they were built). Highlights:

- **Mass assignment fixed everywhere** — every create/update endpoint used to bind request bodies straight onto database entities, letting a caller set `Id`, forge timestamps, or (worst case) send a negative "reserve" quantity that silently freed inventory instead of reserving it. Every write endpoint now goes through a narrow request DTO that only exposes fields a caller should control.
- **Every container runs as a non-root user.**
- **No hardcoded or default credentials anywhere** — every password, JWT secret, and hashing pepper is a required environment variable with no guessable fallback; the stack refuses to start rather than run on a known password.
- **Gateway rate limiting is partitioned per client IP** — an earlier version shared one counter across every caller, so five bad login attempts from any single IP could lock out every real user at once.
- Global exception handling on every service returns generic errors to callers and full detail only to server logs.

Known, deliberately undocumented-vs-hidden gaps: business-API traffic isn't auth-gated (only each gateway's admin surface is — a stated scope boundary, not an oversight); every service in a tenant currently shares one Postgres role rather than per-service least-privilege credentials; and `/metrics` — unauthenticated, like any Prometheus scrape target — exposes every backend's circuit-breaker state (names only, no business data) as a label, so anyone who can reach it can read off aviation backend names without ever holding an aviation role. The one related gap that *is* now closed: `/admin/circuit-breakers` used to return that same unfiltered list to any authenticated caller, letting a retail admin read off aviation backend names through the admin UI itself — that view is now tenant-scoped (`DomainRegistry.BackendVisibleTo`), while the registry underneath stays intentionally shared, since the legacy monolith backend is genuinely one resource serving both tenants and a per-tenant breaker would let one tenant's traffic keep hammering a backend the other tenant's traffic had already tripped.

## Architecture — current state

**Retail — full Strangler Fig loop, legacy/modern toggle live:**
```
                    Client
                      │
                      ▼
              Migration Gateway   ── routes by domain, legacy ⇄ modern
                      │                 (customer, order, inventory — independently)
        ┌─────────────┼─────────────┬─────────────────┐
        ▼             ▼             ▼                 ▼
  Legacy Monolith   Customer     Order Service     Inventory
  (ASP.NET Core)     Service     (ASP.NET Core)      Service
  (Payments,      (Spring Boot)                   (Spring Boot)
   Reports,
   Notifications
   stay here
   permanently)
```

**Aviation — six extracted services, always "modern" (no legacy mirror yet):**
```
                    Client
                      │
                      ▼
              Migration Gateway   ── tenant_id checked, routes straight to modern
                      │
   ┌──────────┬───────┼───────┬──────────┬──────────┬──────────┐
   ▼          ▼       ▼       ▼          ▼          ▼          ▼
Passenger   Fleet   Flight  Booking &   Crew      Baggage &
& Loyalty  & Maint Scheduling Ticketing Management  Freight
 (Java)   (Python) (Java)    (C#)      (Python)     (C#)
```

**Event flow, both tenants (independent of the routing above):**
```
  Order Service ──OrderCreated───────▶ Kafka ──┬──▶ notification-service (simulated notification)
                                                 └──▶ inventory-service (auto-reserves stock)

  Booking Service ──TicketIssuedEvent─▶ Kafka ──────▶ passenger-service (credits loyalty miles)

  Flight Scheduling ──FlightDepartedEvent▶ Kafka ────▶ crew-service (logs duty hours)
```

Customer, Order, and Inventory all currently default to legacy — the gateway can switch any of the three independently, verified live: toggling one leaves the other two untouched. Aviation's six domains have no toggle to switch (see Status above).

## Stack

| Layer | Technology |
|---|---|
| Legacy monolith | ASP.NET Core, PostgreSQL (retail domains + aviation tables seeded, no aviation API yet) |
| Gateway | ASP.NET Core — hand-rolled routing, resilience, multi-tenant JWT auth + RBAC (see `gateway/README.md`) |
| Customer / Inventory Service | Spring Boot, PostgreSQL |
| Order / Booking & Ticketing / Baggage & Freight | ASP.NET Core, PostgreSQL (Order and Booking use a transactional outbox → Kafka) |
| Passenger & Loyalty / Flight Scheduling | Spring Boot, PostgreSQL |
| Fleet & Maintenance / Crew Management | FastAPI, PostgreSQL |
| Events | Kafka (KRaft mode), transactional outbox, four independent consumers across two tenants |
| Observability | Correlation IDs everywhere, Prometheus (native + Micrometer + prometheus-fastapi-instrumentator), Grafana, Loki |
| Security | Multi-tenant JWT + RBAC, tenant isolation with audited cross-tenant denials, rate limiting, non-root containers throughout |
| Dashboard | Next.js 16, TypeScript, plain CSS — tenant-aware workspace switching |
| Data migration | Python scripts + validation, one per retail domain |
| Testing | pytest, xUnit, JUnit, k6 |
| Infra | Docker Compose — 27 containers across both tenants |

Free and open-source only. Runs locally.

## Repo layout

- `legacy-monolith/` — the original system: Customers/Orders/Products/Payments/Notifications APIs, plus the aviation tables (data only, no API — see Status)
- `gateway/` — multi-tenant routing, resilience, observability, and security
- `services/customer-service/`, `services/order-service/`, `services/inventory-service/` — the three extracted retail domains
- `services/notification-service/` — Kafka consumer (retail)
- `services/passenger-service/`, `services/fleet-service/`, `services/flight-scheduling-service/`, `services/booking-service/`, `services/crew-service/`, `services/baggage-service/` — the six extracted aviation domains
- `dashboard/` — the visual GUI, retail and aviation workspaces
- `migration/data-migrator/` — retail migration scripts plus their pytest suite
- `tests/load/` — k6 load test script
- `infrastructure/` — Prometheus scrape config, Grafana datasource provisioning
- `docs/architecture/` — architecture docs
- `docs/decisions/` — ADRs
- `AVIATION-EXPANSION-HANDOFF.md` — full status snapshot of the aviation build: what's done, gotchas hit, and exactly what "the full version" (legacy mirror + toggle) requires next
- `MANUAL.md` — verification walkthrough

## Running it

Copy `.env.example` to `.env` and fill in every required secret — `JWT_SECRET`, `POSTGRES_PASSWORD`, the retail role passwords (`ADMIN`/`MIGRATION_ENGINEER`/`OPERATOR`), the aviation role passwords (`FLIGHT_DISPATCHER`/`FLEET_MANAGER`/`GATE_AGENT`), and `PASSPORT_HASH_PEPPER` (compose refuses to start without any of these — see `docs/architecture/security.md`), then:
```
docker compose up
```
Brings up all 27 containers: legacy monolith, gateway, both tenants' services, Kafka, notification-service, the dashboard, Prometheus, Grafana, Loki, and one database per service. Open the dashboard at `http://localhost:3001`:

- Log in as `admin` (or `migrator`/`operator`) for the **retail** workspace — Customer/Order/Inventory cutover buttons, circuit breakers, audit log.
- Log in as `dispatcher`/`fleetmgr`/`gateagent` for the **aviation** workspace — Flight Board, Fleet Status, Passenger Manifest, Gate Check-in, tenant-scoped audit log.

Grafana's at `http://localhost:3000`, Prometheus at `http://localhost:9090`. Migrate existing retail data with `docker compose run --rm customer-migrator`, `order-migrator`, or `inventory-migrator`.

**See `MANUAL.md`** for the detailed verification walkthrough, and **`AVIATION-EXPANSION-HANDOFF.md`** for exactly where the aviation build stands and what's planned next.
