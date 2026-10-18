# dashboard

Next.js 16, TypeScript, plain CSS (no Tailwind/Bootstrap). Phase 11 — the actual visual GUI: login, per-domain routing control with cutover/rollback buttons, circuit breaker status, and an ADMIN-only audit log. Talks directly to the gateway's real API — nothing here is mocked.

## Pages

- `/login` — calls the gateway's real `POST /auth/login`
- `/` — the dashboard itself, redirects to `/login` if not authenticated

## What it shows, and what's role-gated

- **Domain routing** (customer/order/inventory): current mode plus a cutover/rollback button. Buttons are disabled for OPERATOR — matches the gateway's own RBAC exactly, so a read-only user sees *why* the button doesn't work, not just a mysterious 403 if they tried anyway.
- **Circuit breakers**: live state per backend from `/admin/circuit-breakers`.
- **Audit log**: ADMIN only, mirrors the gateway's own restriction — MIGRATION_ENGINEER and OPERATOR simply don't see this section at all rather than seeing it and hitting a permission error.

Polls every 5 seconds. A 401 from any call (e.g. the token expired) logs the user out and returns to `/login` automatically.

## Verified — actually built and run, with one real fix along the way

`npm install` and `npm run build` both genuinely run here (npm's registry is reachable, unlike NuGet/Maven Central) — TypeScript compiles clean, both routes pre-render successfully. `npm start` was then run for real and both routes confirmed serving valid HTML (200, correct `<title>`).

**Found and fixed while installing**: the initial `npm install` flagged 3 high-severity CVEs in transitive dependencies (PostCSS, sharp) at Next.js 15. Bumped to Next 16, reinstalled, confirmed `npm audit` now reports zero vulnerabilities — not something to ship right after finishing a security phase.

**What curl-based testing can't show**: the login form and dashboard content are client components that render after `AuthProvider` checks `localStorage` in a `useEffect` — during server rendering (and therefore in curl's view) that gate hasn't run yet, so the page body is intentionally empty until client-side JavaScript hydrates. This is expected behavior, not a bug — real browsers hydrate immediately — but it does mean the actual interactive behavior (does the login form submit correctly, does the routing toggle actually work) needs a real browser to verify, which this sandbox doesn't have. High confidence regardless: every API call this dashboard makes (`/auth/login`, `/admin/routing`, `/admin/circuit-breakers`, `/admin/audit-log`) uses the exact same request shape already proven working in `docs/architecture/security.md`'s live 8-step test.

## Running it

```
docker compose up dashboard gateway
```
Then open `http://localhost:3001`. Log in with whichever credentials you set in `.env` (see `../.env.example` and `../MANUAL.md`).

**Important if you're not running the browser on the same machine as Docker**: `NEXT_PUBLIC_GATEWAY_URL` is baked into the JavaScript bundle at *build* time, not read at runtime — because the API calls happen in your browser, not inside the container. The default (`http://localhost:8080`) assumes the browser and `docker compose` are on the same machine. If they're not, rebuild with `docker compose build --build-arg NEXT_PUBLIC_GATEWAY_URL=http://<real-host>:8080 dashboard`.

Locally without Docker: `npm install && npm run dev`, with `.env.local` (copy `.env.example`) pointing at wherever the gateway actually runs.
