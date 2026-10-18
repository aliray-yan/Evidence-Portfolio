# Migration architecture

## The mechanism

One routing table, one place: `gateway/Routing/RoutingState.cs` holds `{ "customer": "legacy"|"modern", "order": ..., "inventory": ... }` in memory. Every incoming request resolves its domain from the URL path (`/api/customers` → `customer`, etc.), looks up that domain's current mode, and forwards accordingly — see `overview.md` for the full request-flow diagram. Domains not in the table (Payments, Reports, Notifications) always go to legacy; there's nothing to look up because there's no modern alternative yet.

## Cutover and rollback are the same mechanism

`PUT /admin/routing/{domain} {"mode": "modern"}` is a cutover. `PUT /admin/routing/{domain} {"mode": "legacy"}` on an already-modern domain is a rollback. There's no separate "rollback" code path — the gateway doesn't distinguish "first migration" from "reverting a bad one," which is exactly why this was cheap to build (Phase 2 built the mechanism once; Phases 5 and 7 got rollback for free when Order and Inventory were extracted, without new code). Verified live for all three domains, independently, in `gateway/README.md`.

## What triggers a rollback, in practice

Nothing automatic today — a human (ADMIN or MIGRATION_ENGINEER) decides and calls the endpoint, or clicks the dashboard's "Roll back to legacy" button. The circuit breaker (`resilience.md`) is the closest thing to an automatic safety mechanism: if the modern backend starts failing, requests fail fast rather than hang, but the gateway doesn't *automatically* flip a domain back to legacy on repeated failures — that's still a manual call. A more complete system might auto-rollback after N consecutive circuit-breaker trips; not built here, worth flagging as a real next step rather than assuming it happens.

## The state machine the spec envisioned vs. what's actually built

The original spec (section 23) describes a richer state machine: `LEGACY → MIGRATION_PREPARING → DATA_MIGRATING → VALIDATING → READY_FOR_CUTOVER → MIGRATING → MODERN → ROLLBACK → DECOMMISSIONED`. What's actually built is simpler: two states per domain (`legacy`/`modern`), with the data migration (`migration/data-migrator/`) run as a separate, manual step *before* cutover rather than a tracked state the gateway knows about. This is a real simplification: there's no enforcement today that data was actually migrated and validated before someone flips a domain to modern — that's a process expectation (documented in each migrator's README), not a technical guarantee. A stricter version would have the gateway refuse to accept `mode: modern` until it's seen a `VALIDATED` signal for that domain.

## Data migration's place in this picture

Each domain's data migration is a standalone script (`migrate_customers.py`, `migrate_orders.py`, `migrate_inventory.py`), run once before cutover, not by the gateway and not automatically triggered by anything. See `migration/data-migrator/README.md` for the verified dry-run → real-run → idempotent-re-run pattern common to all three.
