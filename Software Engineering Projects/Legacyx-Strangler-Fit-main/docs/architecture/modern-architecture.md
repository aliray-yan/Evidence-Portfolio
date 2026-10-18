# Modern architecture

## The three extracted services

| | Customer Service | Order Service | Inventory Service |
|---|---|---|---|
| Stack | Spring Boot / Java 21 | ASP.NET Core / .NET 8 | Spring Boot / Java 21 |
| Database | `customer_db` | `order_db` | `inventory_db` |
| Extracted | Phase 3 | Phase 5 | Phase 7 |
| Publishes events | — | `OrderCreated` (outbox pattern) | — |
| Consumes events | — | — | `OrderCreated` (auto-reserves stock) |

Two stacks, deliberately — see `docs/decisions/ADR-004-java-and-dotnet-together.md`.

## The pattern every one of them follows

1. **Owns its own database.** No service queries another's tables directly — `data-architecture.md` has the full layout. Cross-domain reads happen through APIs (gateway-forwarded) or events (Kafka), never a shared connection string.
2. **References other domains by business key, not internal ID.** `order-service`'s `Order.CustomerNo` and `OrderItem.Sku` are strings, not the numeric IDs `legacy-monolith` uses internally — because those numeric IDs are only meaningful *within* whichever database currently owns that domain, and a business key stays valid whether the domain is on legacy or modern. This single design decision, made once during Customer's extraction, is what let Order's extraction reference Customer correctly without knowing (or caring) whether Customer had been cut over yet. See `services/order-service/README.md` for the fuller reasoning.
3. **Doesn't know the gateway or the migration exists.** None of the three services have any strangler-fig-specific code — no "am I in legacy mode" checks, no gateway awareness. They're just normal REST APIs. The gateway is entirely responsible for deciding who gets which traffic; the services themselves are as simple as if they'd been built standalone from day one. This is deliberate — the migration machinery should be infrastructure's problem, not the business logic's.
4. **Same field-mapping discipline (the anti-corruption layer).** `overview.md` documents Customer's specific mapping (`CustomerName`→`fullName`, `CustStatus`→`status`); the same principle — modern field names, no legacy abbreviations leaking through — applies to Order and Inventory, though their legacy shapes needed less renaming to begin with (see `services/inventory-service/README.md`'s note on why `sku` didn't need changing).

## Verification

Customer Service and Inventory Service: `mvn test`/`mvn clean package` not run here (Maven Central blocked). Order Service: same story with `dotnet build` (NuGet blocked). All three written to standard, idiomatic patterns for their frameworks — see each service's own README and `MANUAL.md` for exact local verification steps.
