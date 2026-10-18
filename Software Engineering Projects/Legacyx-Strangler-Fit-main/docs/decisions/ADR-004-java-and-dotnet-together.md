# ADR-004: Java and .NET together, deliberately

## Status
Accepted

## Context
Real enterprises rarely run one stack. A portfolio project using only Java (or only .NET) demonstrates less than one that shows both, and shows they can coexist behind a single gateway.

## Decision
Legacy monolith, gateway, and Order Service: ASP.NET Core. Customer Service and Inventory Service: Spring Boot. Split roughly by the original spec's own suggested assignment, not arbitrarily.

## Alternatives considered
- **Single stack throughout** — rejected. Simpler, but demonstrates less, and doesn't reflect how real modernization projects actually look (inheriting a mixed-technology estate is normal, not an edge case).

## Consequences
- Two sets of build tooling, two sets of "can't verify here" caveats (NuGet, Maven Central) rather than one — see `MANUAL.md`.
- The anti-corruption layer and business-key-reference pattern (`data-architecture.md`) had to be genuinely stack-agnostic, not something one language's idioms could quietly leak into — a useful forcing function, not just extra work.
- Consistent per-service patterns (own database, own README, own verification story) matter more than stack choice for keeping the repo navigable with two languages in play.
