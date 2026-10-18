# gateway

ASP.NET Core reverse proxy. Every client request comes through here first. The routing table maps each extracted domain (`customer`, `order`, ...) to `legacy` or `modern` independently; anything that isn't a recognized domain always goes to legacy — there's no route for it to switch. Backends are configured as `Backends:Legacy` (one URL) and `Backends:Modern:{domain}` (one per extracted domain), so adding a new domain is a config change plus a `RoutingState`/`ResolveDomain` entry, not a rewrite.

## Why not YARP

The original plan called for YARP. This uses a small hand-written forwarder instead, built entirely on `HttpClient` and ASP.NET Core's own APIs, for two reasons: the routing decision here depends on mutable runtime state (the routing table), which is more direct to express by hand than through YARP's config-driven route/cluster model, and it means this project has zero external NuGet dependencies — so unlike the monolith, this one actually builds and runs in a network-restricted sandbox. Swapping in YARP later is a reasonable move if you want it.

`NuGet.Config` in this folder clears the default package sources — harmless with zero dependencies, but delete it (or add sources back) if you ever add a real `PackageReference` here.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Gateway's own health check |
| GET | `/admin/routing`, `GET /admin/circuit-breakers` | Read-only, requires ADMIN/MIGRATION_ENGINEER/OPERATOR |
| PUT | `/admin/routing/{domain}` | Requires ADMIN or MIGRATION_ENGINEER — the one action the spec explicitly requires a role for |
| GET | `/admin/audit-log` | ADMIN only — every routing change, who/when/old→new/result |
| POST | `/auth/login` | `{"username","password"}` → JWT, rate-limited to 5/min |
| GET | `/metrics` | Prometheus text format, unauthenticated (see `docs/architecture/security.md` for why) |
| * | anything else | Forwarded to whichever backend the routing table says, through a per-backend circuit breaker with timeout + retry — see `../docs/architecture/resilience.md`. `X-LegacyX-Routed-To`, `X-Circuit-Breaker`, and `X-Correlation-Id` response headers show what happened. |

Routing state, circuit breaker state, the user store, and the audit log are all in-memory and reset on restart — fine for a demo, see `../docs/roadmap.md` for what persisted versions would need.

## Verified

Zero external dependencies meant this one could actually be built and run in the environment that wrote it, across four rounds of testing:

1. **Routing** — health check, reading/writing the routing table, GET and POST forwarding, invalid-mode rejection, graceful 503 for unconfigured backends.
2. **Multi-domain** — customer, order, and inventory route independently; toggling one confirmed live to leave the other two untouched.
3. **Resilience** — a real backend was killed and restarted mid-test: 3 failed requests opened the circuit, the next request failed in 9ms instead of ~615ms, recovered via the half-open trial, and a POST was confirmed (via a request counter) to hit the backend exactly once. Full walkthrough: `../docs/architecture/resilience.md`.
4. **Security** — full auth flow tested live: no-token rejection (401), wrong role rejection (403, correctly distinct from 401), OPERATOR's read-only access working while write access is blocked, MIGRATION_ENGINEER's routing change actually taking effect and showing up correctly in the ADMIN-only audit log, and rate limiting kicking in after 5 login attempts. Full walkthrough: `../docs/architecture/security.md`.

Two real bugs turned up during testing and got fixed, not just noted: round 1's `Content-Length`/chunked-encoding issue (fixed via `ByteArrayContent`), and round 4's 403-for-everything instead of properly distinguishing 401 (no token) from 403 (wrong role).

## Running it

**Via Docker Compose (from the repo root):**
```
docker compose up legacy-db legacy-monolith gateway
```
Needs `JWT_SECRET`, `ADMIN_PASSWORD`, `MIGRATION_ENGINEER_PASSWORD`, and `OPERATOR_PASSWORD` set — see `../.env.example`. `docker compose up` fails with a clear error if any are missing, rather than running with a guessable default.

**Locally:**
```
dotnet run
```
Points at `http://localhost:5000` for the monolith by default (see `appsettings.Development.json`, which also has clearly-marked local-dev-only test credentials) — override with the `Backends__Legacy` env var if yours runs elsewhere.
