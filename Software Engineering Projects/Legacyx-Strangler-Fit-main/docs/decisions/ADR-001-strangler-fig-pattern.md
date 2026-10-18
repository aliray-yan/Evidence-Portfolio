# ADR-001: Adopt the Strangler Fig pattern

## Status
Accepted

## Context
LegacyX models a 15-year-old monolithic application that a company can't take offline and can't safely rewrite in one pass — every module shares a database and shares deployment, so a full rewrite carries the risk of shipping nothing for months and then breaking everything at once.

## Decision
Extract functionality incrementally, one domain at a time, behind a migration gateway that routes each request to either the legacy system or the newly extracted service. The legacy system keeps serving every domain that hasn't been extracted yet.

## Alternatives considered
- **Big-bang rewrite** — rejected. High risk, no incremental value, no way to validate the new system against real traffic before full cutover.
- **Do nothing / patch the monolith indefinitely** — rejected. Doesn't solve the underlying coupling and scaling problems, and the point of this project is to demonstrate the modernization itself.

## Consequences
- Two systems run in parallel during migration, which means an anti-corruption layer is required so legacy data shapes don't leak into the new domain model.
- Every extraction needs a rollback path — the gateway must be able to send traffic back to legacy if the modern service misbehaves.
- Slower than a rewrite in the short term; the payoff is that nothing is ever fully down, and each extraction is small enough to reason about.
