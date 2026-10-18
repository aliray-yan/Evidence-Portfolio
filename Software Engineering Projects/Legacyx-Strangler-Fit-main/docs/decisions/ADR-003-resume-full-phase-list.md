# ADR-003: Resume the full original phase list (through Phase 10)

## Status
Accepted

## Context
ADR-002 scoped v1 down to one domain, reasoning that the full original spec (5 domains, both stacks, Kafka, full observability, RBAC) was multi-quarter team-sized work unrealistic for a solo, part-time build. That v1 was completed and verified where the sandbox allowed it.

After v1 shipped, the project's owner made an informed decision to continue past v1 toward the original spec's Phase 10 (Security), having been shown explicitly what that entails: Order extraction, Kafka, Inventory extraction, resilience patterns, a full observability stack, and RBAC.

## Decision
Continue building toward Phase 10, phase by phase, at the same quality bar as v1 (real code, live-tested wherever the sandbox's network allowlist permits, honest about what isn't verifiable here). Not attempted in a single turn — each remaining phase (5 through 10) is roughly v1-sized on its own.

## Consequences
- `docs/roadmap.md` switches from the Tier 1/2/3 framing back to tracking the original spec's Phase 1–13 numbering directly.
- Timeline extends significantly — this is no longer a "finish this weekend" project.
- The architectural groundwork from v1 (anti-corruption layer via business keys, gateway as the single routing authority, per-service databases) extends naturally to additional domains rather than needing rework.
- ADR-002's reasoning wasn't wrong — it's still why v1 shipped instead of nothing. This is a deliberate, later decision to keep going, not a reversal of that one.
