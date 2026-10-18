# Security

## What this covers, and what it deliberately doesn't

The spec's specific, explicit requirement — "migration configuration changes must require an authorized role" — is what's actually implemented and tested: JWT auth + RBAC gates the gateway's `/admin/*` endpoints. **Business-API traffic itself (customer/order/inventory CRUD, passed through by the catch-all forwarder) is not auth-gated.** That's a real, deliberate scope boundary, not an oversight — extending auth to every downstream service's own endpoints is a much larger effort (each of the four backend services would need its own auth story) and wasn't what the spec called out specifically. Documented here so it's not mistaken for "done."

## Roles

Two role sets, one per tenant, both issued by the same `/auth/login` and validated by the same JWT scheme. Retail: `ADMIN`, `MIGRATION_ENGINEER`, `OPERATOR`. Aviation: `AVIATION_ADMIN`, `AVIATION_MIGRATION_ENGINEER` (cutover authority, added alongside the legacy mirror — see `AVIATION-EXPANSION-HANDOFF.md`), `FLIGHT_DISPATCHER`, `FLEET_MANAGER`, `GATE_AGENT` (pre-existing operational roles, read-only on the admin surface for the same reason retail's OPERATOR is). `USER` from the spec's list isn't implemented for either tenant — there's no unauthenticated-but-identified end-user concept anywhere in this system, since the business APIs aren't auth-gated at all.

A token's tenant is embedded in the JWT itself (`gateway/Security/RolePolicy.cs`), not inferred from the role name, and `/admin/*` responses are scoped to the caller's own tenant — a retail token never sees aviation routing state, breaker entries, or audit rows, and vice versa (`CROSS_TENANT_DENIED`, audited, if a token's tenant doesn't match what an endpoint requires).

| Endpoint | Allowed roles |
|---|---|
| `GET /admin/routing`, `GET /admin/circuit-breakers` | Retail: ADMIN, MIGRATION_ENGINEER, OPERATOR. Aviation: AVIATION_ADMIN, AVIATION_MIGRATION_ENGINEER, FLIGHT_DISPATCHER, FLEET_MANAGER, GATE_AGENT. All read-only except the two admin/migration-engineer roles. |
| `PUT /admin/routing/{domain}` | ADMIN, MIGRATION_ENGINEER (retail) / AVIATION_ADMIN, AVIATION_MIGRATION_ENGINEER (aviation) |
| `GET /admin/audit-log` | ADMIN only (retail) / AVIATION_ADMIN only (aviation) — each sees only their own tenant's rows |
| `PUT /admin/aviation/flights/{id}/status` | FLIGHT_DISPATCHER |
| `POST /auth/login` | anyone (rate-limited, see below) |
| `GET /health`, `GET /metrics` | unauthenticated — see reasoning in `gateway/Program.cs` |

401 vs 403 is deliberate, not arbitrary: 401 means no valid token was presented at all; 403 means a valid token was presented but that role, or that role's tenant, isn't allowed here — see "found while testing" below.

## How it's built

- **JWT**: hand-rolled HS256 (`gateway/Security/JwtService.cs`) using only `System.Security.Cryptography` — no JWT library. Same "keep the gateway dependency-free and testable" reasoning as routing, resilience, and metrics; JWT's format is precisely specified enough that hand-rolling it isn't the kind of risk hand-rolling, say, TLS would be. Constant-time signature comparison (`CryptographicOperations.FixedTimeEquals`) to avoid timing attacks.
- **Passwords**: PBKDF2, 100,000 iterations, random salt per user (`gateway/Security/UserStore.cs`) — never stored or compared in plaintext, even for this demo.
- **No hardcoded credentials anywhere**: the base `appsettings.json` has no `Auth` section at all; `docker-compose.yml` requires `JWT_SECRET`, `ADMIN_PASSWORD`, `MIGRATION_ENGINEER_PASSWORD`, `OPERATOR_PASSWORD`, `FLIGHT_DISPATCHER_PASSWORD`, `FLEET_MANAGER_PASSWORD`, `GATE_AGENT_PASSWORD`, `AVIATION_ADMIN_PASSWORD`, `AVIATION_MIGRATION_ENGINEER_PASSWORD`, and `PASSPORT_HASH_PEPPER` via `${VAR:?error message}` syntax — `docker compose up` fails immediately with a clear message if any are unset, rather than silently running with a guessable default. Local dev has its own clearly-marked test credentials in `appsettings.Development.json`, same convention as `POSTGRES_PASSWORD=changeme` elsewhere in this repo.
- **Rate limiting**: `POST /auth/login` is limited to 5 attempts/minute via ASP.NET Core's built-in rate limiter (`Microsoft.AspNetCore.RateLimiting`, part of the framework since .NET 7 — no package needed either).
- **Audit log**: every `PUT /admin/routing/{domain}` call — success or failure — is recorded with who, when, old value, new value, and result (`gateway/Security/AuditLog.cs`), matching the spec's example format. Viewable only by ADMIN.

## Verified — actually run, full flow

All of the following was tested live against a real running gateway in the environment that wrote it:

1. `PUT /admin/routing` with no token → **401**.
2. Login with wrong password → **401**.
3. Login as OPERATOR → succeeds; OPERATOR then tries to change routing → **403** (valid token, wrong role — correctly distinct from case 1's 401).
4. OPERATOR *can* view routing (read-only role) → **200**.
5. MIGRATION_ENGINEER changes routing → **200**, and it actually takes effect.
6. MIGRATION_ENGINEER tries to view the audit log → **403** (ADMIN only).
7. ADMIN views the audit log → shows the exact change from step 5: `user: migrator, action: ROUTING_CHANGED, domain: customer, oldValue: legacy, newValue: modern, result: SUCCESS`, real timestamp.
8. Rate limiting: after several login attempts across the session (steps above already used some of the budget), further attempts within the same minute returned **429** — confirming the limiter counts real traffic across the whole window, not just a narrow synthetic burst.

## Found while testing

The first pass returned 403 for *both* "no token" and "wrong role" — technically not incorrect (many APIs do use 403 uniformly), but not the more correct REST convention (401 = who are you, 403 = I know who you are, you can't do this). Caught while writing the test, not left as a known gap — `Authorize()` now returns the right one deliberately.

## What's not built

- No auth on the business APIs themselves — see the top of this doc.
- No refresh tokens — a 1-hour JWT expires and requires a fresh login, no silent renewal.
- No HTTPS/TLS anywhere in this repo. For an all-localhost/all-docker-internal demo this doesn't add real protection and local cert setup would be pure overhead — noted rather than implemented, since "HTTPS where practical" is the spec's own qualifier and it isn't practical here.
- No input validation hardening beyond what already existed (model binding, the occasional `[Required]`-style check) — a real pass would add stricter validation on every admin/auth request body.
- The audit log, user store, and JWT secret are all in-memory / config-only — nothing persists across a restart. A production version needs a real datastore for the audit log specifically (spec section 20 calls for it to be "immutable," which really implies write-once storage, not just "no delete endpoint").
- No formal threat model beyond this doc — see `docs/architecture/threat-model.md` (Phase 13) for that treatment.
