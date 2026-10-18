# LegacyX — Aviation Expansion Handoff

> **Status: the "full version" this file asks for is now built.** All 11 aviation domains have a working legacy-monolith REST API, the gateway routes and toggles all of them (legacy ⇄ modern) with the two new cutover roles this file's §6 asked about, and the dashboard shares one cutover UI across both tenants. The six divergences found while testing that build live are resolved: the two false alarms (a 502 from Spring's cold start, four stale-container 422s) needed no code change; the genuine one — the four Spring services' `@ExceptionHandler(Exception.class)` swallowing a `HttpMessageNotReadableException` into a 500, plus passenger-service's `dateOfBirth` accepting null and silently truncating a timestamp — is fixed in all four services and in `PassengerRequests.java`. See `MANUAL.md`'s "Aviation expansion" section for exact verification commands; that fix is the one thing this pass reasoned through but couldn't compile (no `javac`/Maven Central in this sandbox either). Left below, unedited, as the record of what was asked for and why — not because it's still open.
>
> Real gaps that *are* still open, not covered by this file: `MANUAL.md` has no per-service walkthrough for the six aviation services yet (customer/inventory/order's sections are the pattern to follow); there's no ADR for the retail→multi-tenant decision itself, the way ADR-003 exists for the phase-scope decision; and the known, deliberate scope boundaries this file already documents below (shared circuit-breaker registry, no per-service DB roles) are still exactly as documented.

**Purpose of this file:** a complete status snapshot to paste into a new chat so work can continue without re-deriving context. Written at the end of a session that (1) got the whole LegacyX platform running for the first time, (2) ran a 20-point security audit and fixed every real finding, then (3) expanded the platform from retail-only to multi-tenant (retail + aviation). This file focuses on (3), with enough of (1)/(2) to explain why things are shaped the way they are.

---

## 1. What LegacyX is

A demo platform showing the **Strangler Fig pattern**: a legacy monolith gets replaced one domain at a time by extracted microservices, behind a gateway that can route each domain independently to "legacy" or "modern" — with instant rollback. Originally retail/e-commerce only (Customer, Order, Inventory). This session added a second, fully separate **aviation tenant**.

---

## 2. What's done — retail side (unchanged, already working before this session's aviation work)

- **Legacy monolith** (ASP.NET Core) — Customers, Orders, Products, Payments, Notifications, all with EF Core + Postgres, auto-migrating on startup.
- **3 extracted services**: `customer-service` (Java/Spring Boot), `order-service` (C#, outbox→Kafka), `inventory-service` (Java/Spring Boot, Kafka consumer).
- **Gateway** (C#, hand-rolled, zero external deps): JWT auth, RBAC (`ADMIN`/`MIGRATION_ENGINEER`/`OPERATOR`), per-domain legacy/modern routing table, circuit breaker, audit log, Prometheus metrics, rate limiting.
- **Dashboard** (Next.js): login, per-domain cutover/rollback buttons, circuit breaker view, audit log (ADMIN only).
- **Kafka**: `OrderCreated` event — `order-service` publishes via outbox, `notification-service` (Python) and `inventory-service` both consume independently.
- **Data migrators** (Python): one script per retail domain, copies legacy→modern with validation.
- Full observability stack (Prometheus/Grafana/Loki), all wired and verified.

All of this was **gotten running for the first time this session** (it had never been executed in the sandbox that originally wrote it — no Docker, no NuGet/Maven access there). Real bugs found and fixed just getting it running:
- No EF Core migrations existed at all — generated them for `legacy-monolith` and `order-service`.
- Kafka event producer serialized PascalCase JSON; both consumers expected camelCase per the documented spec — silently broke the entire event pipeline until fixed.
- Gateway had zero CORS support — the dashboard couldn't talk to it from a browser at all.
- Docker Desktop's IPv6 loopback forwarding was broken on this host; since Windows resolves `localhost` to `::1` first, every browser request hung indefinitely. Fixed by binding all published ports to `127.0.0.1` explicitly instead of `0.0.0.0`.

---

## 3. What's done — the 20-point security audit

Ran 6 parallel audits (gateway, both .NET services, both Java services, Python scripts, Docker/deployment config) against a 20-point checklist (auth, authorization, injection, XSS/CSRF, rate limiting, headers, CORS, secrets, error handling, DB/container hardening). **16 real findings, all fixed and re-verified live**, most severe:

- **Critical**: mass assignment on every create/update endpoint across both .NET and both Java services — request bodies were bound directly onto DB entities, letting a client set `Id`, forge `CreatedAt`, jump an order straight to `SHIPPED`, or (worst) send a negative "reserve" quantity that silently *freed* inventory instead of reserving it. Fixed everywhere with narrow request DTOs.
- **High**: gateway's login rate limiter shared one counter across every client (5 bad requests from any IP locked out every real user) — fixed with per-IP partitioning. Every container ran as root — fixed with non-root users in all 8 Dockerfiles. A literal `changeme` password was hardcoded (with silent fallback) across 4 languages — fixed with required, no-default env vars everywhere.
- **Medium**: no exception handling (risk of leaking stack traces), no security headers, gateway leaked internal hostnames on backend failures, unvalidated correlation-ID header, Grafana anonymous access had full Admin, Kafka consumer had no cap on malicious message size, migration scripts risked logging PII on DB errors.

**This established the security patterns reused throughout the aviation build**: narrow request DTOs (no entity binding), non-root Docker users from the start, required env vars with no guessable defaults, global exception handlers returning generic client-facing errors, per-IP rate limiting, security headers.

Full findings report was published separately as an artifact during that session — not reproduced in full here, just the patterns that matter for continuing the aviation work.

---

## 4. What's done — the aviation expansion (this session, latest phase)

### 4.1 Scope decision made (worth knowing before continuing)

The original spec asked to "seed aviation schemas into the legacy monolith to represent the Before state" and then build 6 extracted microservices. **I seeded the schema (11 tables, real Postgres tables via EF migration) but did NOT build REST controllers for them in `legacy-monolith`.** So right now aviation has only one working backend (the 6 new microservices) — there is no functioning "legacy aviation API" to route traffic to. This is exactly why aviation currently has **no legacy/modern toggle and no aviation "admin" cutover role** — see §6 for what adding that for real requires.

### 4.2 Legacy monolith — aviation schema seeded

11 tables added to `LegacyDbContext` (`legacy-monolith/Models/Aviation.cs`, migration `AddAviationTenant`): `Passengers`, `LoyaltyAccounts`, `Aircraft`, `MaintenanceLogs`, `Routes` (as `FlightRoute` class — see §7 gotchas), `Flights`, `Bookings`, `Tickets`, `CrewMembers`, `FlightAssignments`, `BaggageItems`. No controllers on top — data-only, matching §4.1.

### 4.3 Gateway — multi-tenant rework

File: `gateway/Program.cs`, `gateway/Security/*.cs`.

- JWT gained a `tenant_id` claim (`JwtService.cs`, `JwtPrincipal` record now `(Subject, Role, TenantId)`).
- `UserStore.cs` seeds two disjoint role sets: retail (`ADMIN`/`MIGRATION_ENGINEER`/`OPERATOR`, unchanged) and aviation (`FlightDispatcher`/`FleetManager`/`GateAgent`, new — spec-named roles, no separate "aviation admin" was added, see §6).
- `Authorize()` now checks **tenant before role**: a valid token for the wrong tenant is a distinct 403 ("cross-tenant"), audited separately from a plain insufficient-role 403.
- The catch-all proxy resolves both **domain** and **tenant** per request (`ResolveDomain`/`ResolveTenant`). If a Bearer token is present and its tenant doesn't match the resource's tenant → immediate 403, logged to the audit log under the *acting user's own tenant* (so a retail admin's failed attempt on aviation shows up in retail's audit log, not aviation's).
- Aviation domains route straight to their microservice — **no legacy/modern branch**, `mode` is hardcoded `"modern"` for aviation (see §4.1/§6).
- `AuditLog.cs` gained a `TenantId` field; `/admin/audit-log` is tenant-scoped automatically — retail needs `ADMIN` to view it, aviation allows any of its 3 roles (no aviation admin role exists to restrict it to).
- One representative aviation admin action was wired end-to-end: `PUT /admin/aviation/flights/{id}/status`, gated to `FlightDispatcher`, proxies to Flight Scheduling Service, fully audited. Not exhaustive across all 6 services — just enough to prove the RBAC+audit pattern works for aviation too.

### 4.4 Six new microservices

| # | Domain | Stack | Port | DB (host port) | Notes |
|---|---|---|---|---|---|
| 1 | Passenger & Loyalty | Java/Spring Boot | 8084 | `passenger-db` :5436 | Passport numbers salted-SHA256-hashed, never stored/returned raw (`PASSPORT_HASH_PEPPER` env var). Consumes `TicketIssuedEvent` → credits miles. |
| 2 | Fleet & Maintenance | Python/FastAPI | 8085 | `fleet-db` :5440 | No Kafka. `prometheus-fastapi-instrumentator` for metrics (2 lines, no hand-rolled counters). |
| 3 | Flight Scheduling | Java/Spring Boot | 8086 | `flight-scheduling-db` :5437 | Publishes `FlightDepartedEvent` on transition into `Airborne` (direct publish, not outbox — spec only required outbox for Booking). |
| 4 | Booking & Ticketing | C#/.NET | 8087 | `booking-db` :5438 | Transactional outbox pattern (mirrors `order-service` exactly). `POST /{id}/confirm` issues a `Ticket` + writes the outbox row in the same DB transaction. |
| 5 | Crew Management | Python/FastAPI | 8088 | `crew-db` :5441 | Kafka consumer runs in a background thread (confluent-kafka is blocking/sync); increments `logged_duty_hours` by a flat 1.5h per `FlightDepartedEvent` (documented simplification, not real block-time calc). Has a `tests/test_handle_event.py`. |
| 6 | Baggage & Freight | C#/.NET | 8089 | `baggage-db` :5439 | Simplest — no Kafka, plain CRUD + status workflow. |

All 6: non-root Docker users, required-env-var Postgres passwords (no defaults), narrow request DTOs (no mass assignment — e.g. `quantityReserved`/`milesBalance`/`loggedDutyHours` are never client-settable, only moved by server logic or event consumers), global exception handlers, OpenAPI/Swagger exposed (springdoc for Java, FastAPI's built-in for Python, Swashbuckle for C#) specifically so a ZAP scan has a real API surface to spider per the original spec's checklist item.

### 4.5 Kafka event flows (both verified live end-to-end)

- **`TicketIssuedEvent`**: `booking-service` confirms a booking → outbox → topic `legacyx.aviation.tickets` → `passenger-service` credits `MilesBalance` (5 miles per unit fare paid). Verified: $420.50 fare → exactly 2102 miles credited.
- **`FlightDepartedEvent`**: `flight-scheduling-service` transitions a flight to `Airborne` → topic `legacyx.aviation.flights` → `crew-service` increments every assigned crew member's `LoggedDutyHours`. Verified: 0.00h → 1.50h on departure.

### 4.6 Dashboard — tenant-aware workspace

- `AuthContext.tsx` / `lib/api.ts` carry `tenantId` end-to-end from login response.
- `app/page.tsx` is now a thin shell that renders `RetailWorkspace` or `AviationWorkspace` based purely on the JWT's `tenant_id` — a full navigation-tree swap, not a route change.
- `AviationWorkspace.tsx`: Flight Board (FlightDispatcher can advance status via the gateway's gated endpoint), Fleet Status (read-only), Passenger Manifest (read-only, no passport data ever exposed), Gate Check-in (GateAgent can cycle baggage status — this hits the **business API directly**, unauthenticated by design, same boundary as retail's business endpoints), plus a tenant-scoped audit log.
- Verified live in-browser for both tenants: login → correct workspace renders → correct role-gating (disabled buttons + explanatory hint for the wrong role) → data genuinely flows from the backends.

### 4.7 docker-compose.yml / .env

- 6 new services + 6 new Postgres DBs added, all loopback-bound (`127.0.0.1:PORT`), all following the existing required-password pattern.
- Gateway env block extended: `Backends__Aviation__{domain}` for all 11 aviation domains (several point at the same service, e.g. `passengers` and `loyalty` both → `passenger-service`), plus `Auth__FlightDispatcher*`/`Auth__FleetManager*`/`Auth__GateAgent*` (required, no defaults).
- `.env.example` and the working `.env` both updated with the new vars: `FLIGHT_DISPATCHER_USERNAME`/`PASSWORD`, `FLEET_MANAGER_USERNAME`/`PASSWORD`, `GATE_AGENT_USERNAME`/`PASSWORD`, `PASSPORT_HASH_PEPPER`.

---

## 5. Known gap, already flagged once

`/admin/circuit-breakers` is a genuinely shared/global registry (not tenant-partitioned), so a retail admin can currently see aviation backend *names* in the circuit-breaker list (health/state only, no business data — low severity, but a real cross-tenant visibility gap). Not fixed yet.

---

## 6. What "the full version" (next chat) needs to build

This is the user's explicit next request: aviation should mirror retail exactly — an admin who can hit "cut over to modern" / "roll back to legacy" per domain, same as retail's `ADMIN`/`MIGRATION_ENGINEER`.

1. **Build real REST controllers in `legacy-monolith` for all 11 aviation entities** (Passengers, Loyalty, Aircraft, Maintenance, Routes, Flights, Bookings, Tickets, Crew, Assignments, Baggage) — essentially the same CRUD work already done for the 6 microservices, done a second time as the "legacy" side. This is the big one — without it, steps 2–4 have nothing real to toggle to.
2. **Extend the gateway's routing table** to cover the 11 aviation domains with a legacy/modern toggle each (currently aviation is hardcoded to always route `"modern"` — see `ResolveTenant`/the catch-all's `mode` calculation in `gateway/Program.cs`). `RoutingState.cs`'s in-memory dictionary currently only seeds `customer`/`order`/`inventory`.
3. **Add an aviation admin authority** — either a genuinely new role (e.g. `AviationAdmin`) or extending `FlightDispatcher`/`FleetManager`/`GateAgent` with cutover rights — gated the same way `ADMIN`/`MIGRATION_ENGINEER` gate retail's `/admin/routing/{domain}` today. Decide naming before starting.
4. **Add cutover buttons to `AviationWorkspace.tsx`**, mirroring `RetailWorkspace.tsx`'s `domainGrid`/cutover-button pattern exactly.

Rough sizing: step 1 alone is comparable in size to everything in §4.4 — 11 more sets of controllers/DTOs/validation, not just a switch. Consider whether all 11 domains need it or whether 2–3 representative ones (e.g. Flights, Bookings, Baggage) would prove the pattern for less effort — that trade-off wasn't decided yet, flag it early in the new chat.

---

## 7. Gotchas hit this session — worth knowing before writing more code here

- **C# top-level-statements `Program.cs` cannot contain `static readonly` field declarations** interspersed with the statements — only local *functions* are hoisted/allowed there. Hit this twice (`CorrelationIdPattern`, then `RetailDomains`) — both times fixed by inlining the check into a local function instead of a separate static field.
- **`Route` as a class name collides with `Microsoft.AspNetCore.Routing.Route`** (pulled in by implicit global usings) — renamed to `FlightRoute` in `legacy-monolith/Models/Aviation.cs`.
- **EF Core's primary-key convention only auto-detects `Id` or `{ClassName}Id`.** Most of the spec's actual field names (`AccountId`, `TailNumber`, `CrewId`, `TagId`, `LogId`, `AssignmentId`, `RouteId`) don't match that convention for their class names — every aviation `DbContext` needs **explicit `HasKey()`** calls or migration generation fails at runtime with "requires a primary key to be defined". Already fixed in `legacy-monolith`, `booking-service`, `baggage-service` — remember this if new aviation entities get added to legacy-monolith in step 1 above.
- **C# records: validation attributes go on the constructor parameter directly, never `[property: Required, ...]`.** The latter throws `InvalidOperationException` at request time on this ASP.NET Core version for record primary constructors. Every DTO in this codebase already follows the correct pattern — copy it exactly for new controllers.
- **FastAPI/Pydantic defaults to snake_case; the rest of the platform (Java/Jackson, C#) defaults to camelCase.** Fixed via a shared `CamelModel` base class using Pydantic's built-in `alias_generator=to_camel` + `populate_by_name=True` in both `fleet-service/schemas.py` and `crew-service/schemas.py` — a 3-line fix, not hand-rolled aliasing.
- **`dotnet ef migrations add` can fail silently if you pipe its output through `| tail`** — the outer shell reports exit 0 even when the migration generation itself failed. Always check for "Build failed" / "Build succeeded" in the actual output, or avoid piping through `tail` for anything whose exit code matters.
- Java services use `/actuator/health` (Spring Boot Actuator), not a custom `/health` — the two new Java aviation services follow this too; don't test them at `/health`, they'll 500 (unmapped route falls through to the global exception handler instead of a clean 404 — minor, not fixed).

---

## 8. How to get the stack running again

```bash
cd path/to/legacyx
docker compose up -d
```

Everything (retail + aviation, 27 containers total) should come up healthy. Credentials are in `.env` (gitignored, already populated with generated secrets from this session — don't regenerate unless you want a fresh reset). If Postgres passwords ever change, run `docker compose down -v` first (wipes DB volumes) since Postgres only sets its password at first init.

Dashboard: `http://localhost:3001` — log in as `admin` (retail) or `dispatcher`/`fleetmgr`/`gateagent` (aviation) using the passwords in `.env`.
Gateway: `http://localhost:8080`.

Quick smoke test of the full aviation event chain (adjust IDs after creating your own test data):
```bash
# create passenger -> loyalty enroll -> aircraft -> route -> flight -> booking -> confirm (issues ticket, credits miles) -> advance flight to Airborne (credits crew duty hours)
# see this session's transcript for the exact curl sequence that was used to verify all of this live.
```
