# ADR-002: Scope v1 to one domain, fully realized

## Status
Accepted

## Context
The original concept for LegacyX covered five domains extracted in both Java and .NET, Kafka with a transactional outbox, a full Prometheus/Grafana/Loki observability stack, load testing at 1,000 concurrent users, four-role RBAC with immutable audit logging, and a full threat model — realistically a multi-quarter build for a small team. This is a solo, part-time project running alongside a full course load, an ongoing SOC internship and apprenticeship, and other active projects.

## Decision
Build one domain — Customer — through the complete Strangler Fig lifecycle first: legacy-only, gateway, extraction, data migration and validation, routing, rollback. Everything else from the original concept is documented as roadmap, not built, until v1 is finished and shipped.

## Alternatives considered
- **Build all five domains at reduced depth** — rejected. Spreads effort thin enough that nothing demonstrates the pattern convincingly, and it's the likeliest path to an unfinished repo.
- **Build the full original scope as specified** — rejected as a v1 target. Not a realistic timeline given the other commitments above; attempting it risks finishing none of it.

## Consequences
- v1 proves the Strangler Fig pattern completely, but only for one domain — it doesn't demonstrate breadth (multiple domains) or several of the harder production concerns (Kafka, full RBAC, load testing at scale).
- The deferred scope is documented in `docs/roadmap.md` with reasoning, so the full intended architecture is visible even where it isn't implemented.
- Extending to a second domain (Orders, tier 2) should be mechanical once v1 is solid, since the gateway/ACL/migration pattern already exists — most of the harder design work happens once, in v1.
