# Testing

## What's genuinely verified — actually run, real assertions

- **`migration/data-migrator/tests/`** — 17 tests, all passing: unit tests for all three migration scripts' transform logic (customer status mapping, order FK resolution raising on unknown customer/product, inventory field mapping), plus 2 integration tests against a real throwaway Postgres database confirming the full migrate → verify → idempotency-check cycle actually works. `pytest tests/ -v`, no mocks on the database layer.
- **`services/notification-service/tests/`** — 3 tests, all passing: `handle_event()`'s actual behavior on a valid `OrderCreated` event, an unrelated event type, and a malformed event — asserting on real log output via `caplog`, not just "didn't crash."
- **`gateway/`** — no formal unit-test project (see below for why), but the most extensively tested component in this repo by a wide margin: every phase from Phase 2 onward included live curl-based tests against a real running instance — routing, multi-domain independence, circuit breaker state transitions under an actual killed/restarted backend, the full JWT/RBAC/audit-log flow, correlation ID propagation, and Prometheus metrics output. See `docs/architecture/resilience.md` and `docs/architecture/security.md` for the specific results.

## What's written but not run here

`legacy-monolith/Tests/CustomersControllerTests.cs` (xUnit + `WebApplicationFactory` + EF Core InMemory) and `services/customer-service/src/test/java/.../CustomerControllerTests.java` (JUnit + MockMvc) are representative examples — one per stack, not one per service. Same NuGet/Maven Central limitation as the rest of those services' code: written to the correct, idiomatic pattern for each framework, not blindly. `dotnet test` / `mvn test` are the real checks — see `MANUAL.md`.

Extending the same pattern to `order-service` and `inventory-service` is mechanical once these two compile — not done here to avoid four more files of unverifiable boilerplate with limited additional signal over the two representative examples.

## Why the gateway doesn't have an xUnit project

Every other testable claim in this repo about the gateway comes from hitting its real, running HTTP API — which is a stronger signal than isolated unit tests of `CircuitBreaker` or `JwtService` in isolation would be, and it's what's actually been done, extensively, throughout this project. Adding an xUnit project now would mean either introducing xUnit as a dependency (fine for a separate test project, doesn't affect the main gateway's zero-dependency property) or duplicating class files to avoid a cross-project reference — neither adds much over what curl-based integration testing has already proven. Noted as a real gap in formal unit-test coverage, not hidden: the logic is tested, just not via `dotnet test`.

## Load testing

See `docs/architecture/load-testing.md` — k6 was installed and run for real, one clean result captured, and the sandbox's process-management flakiness that prevented the full 100/500/1,000-VU matrix is documented plainly rather than papered over with invented numbers.

## What a complete Phase 12 would add

- Unit tests for `order-service` and `inventory-service`, same pattern as the two examples here.
- Integration tests using Testcontainers (spec's explicit suggestion) for real Postgres/Kafka integration tests — needs Docker, not available here.
- Tests for authentication, authorization, and idempotency specifically (the spec calls these out by name) beyond what's already covered in `docs/architecture/security.md`'s live-tested flow.
- The full load-testing VU matrix.
