# Resilience

## Where this actually applies

The spec's example is "Inventory service goes down, Order Service's circuit breaker opens" — but in this architecture, Order Service never calls Inventory Service synchronously; they're decoupled through Kafka (Phase 6), which is already resilient to a consumer being down by construction — messages just wait in the topic. The one place synchronous cross-service calls genuinely happen is **the gateway calling its backends**. That's where circuit breaker, timeout, and retry logic actually lives.

The Kafka *consumer* side gets its own, different form of resilience: retry-on-processing-failure, via Spring Kafka's built-in error handler (see below) — not a circuit breaker, since "the backend is down" isn't the failure mode for a message already sitting in a topic.

## Gateway: timeout, retry, circuit breaker

Hand-rolled (`gateway/Resilience/`), not Polly — same reasoning as the YARP decision: keeps the gateway dependency-free and testable, and this is a well-understood enough pattern (three-state machine, failure counting) that hand-rolling it correctly isn't risky the way hand-rolling, say, TLS would be.

- **Timeout**: 5 seconds per attempt.
- **Retry**: only for idempotent methods (GET, HEAD, OPTIONS, PUT, DELETE) — up to 3 attempts with a short backoff. **POST is never retried.** If a POST times out waiting for a response, the backend may have already created the resource; retrying could create it twice. Real fix is idempotency keys (spec section 15, not built) — this is the safe default until that exists.
- **Circuit breaker**: one per backend (`legacy`, `modern:customer`, `modern:order`, `modern:inventory`), independent of each other. Closed → 3 consecutive **request-level** failures (each of which may itself be a retry-exhausted GET) → Open, fails every request instantly for 10 seconds → Half-Open, lets exactly one trial request through → Closed on success, back to Open on failure. `GET /admin/circuit-breakers` shows current state per backend; every response also carries an `X-Circuit-Breaker` header.

## Verified — actually run, watching it happen

All of this was tested live against a real backend that got killed and restarted mid-test, in the environment that wrote it:

1. Baseline: backend up, request succeeds, `X-Circuit-Breaker: closed`.
2. Backend killed. Three GET requests, each retrying internally (~610–624ms each — the timeout/backoff math is visible in the timing) — circuit opens after the third.
3. **Fourth GET: 9ms, not ~615ms.** The circuit breaker skipped attempting the connection entirely — roughly a 68x speedup, and the actual point of "fail fast."
4. Backend restarted, waited past the 10-second open window.
5. Next GET was the half-open trial — succeeded, circuit closed, normal response returned.
6. POST while healthy: confirmed via a request counter on the test backend that it was hit **exactly once** — no retry, as designed.

## Kafka consumer: retry-on-failure

`inventory-service`'s `OrderEventListener` previously caught and logged any processing exception, then moved on — meaning a transient failure (e.g. the database briefly unreachable during `reserve()`) would silently drop that reservation forever. `KafkaErrorHandlingConfig` wires in Spring Kafka's own `DefaultErrorHandler` with a `FixedBackOff` (3 attempts, 1 second apart) instead of hand-rolling retry logic Spring already provides correctly. Not verified live here — same Maven Central limitation as the rest of this service — but it's the standard, documented way to do this in Spring Kafka, not a novel mechanism.

## What's not here

No bulkhead/concurrency limiting, no jitter on the retry backoff (fixed intervals, not randomized — fine at this scale, would matter more under real concurrent load), and the circuit breaker state is in-memory per gateway instance (would need to be shared/distributed if the gateway ever runs as more than one replica). None of these were part of the spec's Phase 8 list; noted here rather than silently out of scope.
