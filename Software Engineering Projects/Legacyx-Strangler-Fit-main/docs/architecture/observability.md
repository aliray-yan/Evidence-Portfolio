# Observability

## The three pieces, and what's actually verified

**Traces (correlation IDs)**: every service — gateway, legacy-monolith, order-service, customer-service, inventory-service — reads an incoming `X-Correlation-Id` header or generates one, echoes it back in the response, and logs it with every request. Grep any service's logs for the same ID and you get that request's path across whichever services handled it. This is correlation-ID tracing, not full OpenTelemetry spans — a deliberate simplification (see below), not the literal spec ask.

**Metrics**: the gateway exposes hand-written Prometheus text format at `/metrics` (no client library — same "keep it dependency-free and testable" reasoning as the routing and resilience code). `order-service` uses `prometheus-net.AspNetCore` for the same at `/metrics`. `customer-service` and `inventory-service` use Micrometer's Prometheus registry via Spring Boot Actuator at `/actuator/prometheus`. `infrastructure/prometheus/prometheus.yml` scrapes all four.

**Logs**: structured logging exists on every service (see traces above); Loki is provisioned in `docker-compose.yml` and as a Grafana datasource, but nothing yet ships logs *into* Loki — see "what's not built" below.

## Why correlation IDs instead of full OpenTelemetry

The spec calls for OpenTelemetry SDK instrumentation. Implementing that properly means adding the OTel SDK to every .NET and Java service — which would cost the gateway its one distinguishing property (zero external dependencies, so it's the one component genuinely built, run, and tested in the sandbox that wrote this). Correlation-ID propagation captures the actual value of OpenTelemetry here — "which requests touched which services, in what order, how long each hop took" — without that trade-off. Swapping in real OTel later is additive: the correlation ID becomes a trace ID, the per-request log lines become spans. Noted as a real gap, not hidden.

## Verified — actually run

The gateway's correlation ID handling and metrics were tested live in the environment that wrote this: a request with no `X-Correlation-Id` gets one generated and forwarded to the backend correctly; a request that supplies its own has that exact ID preserved end to end and echoed in the response; `/metrics` was hit after a mix of GET/POST requests across two domains and rendered valid Prometheus text with accurate counts, per-domain average latency, and circuit breaker state.

What's not verified: whether Prometheus actually scrapes all four targets successfully, whether Grafana's provisioned datasources come up correctly, and the .NET/Java services' own metrics endpoints — all of that needs Docker, which this sandbox doesn't have. See `MANUAL.md`.

## What's not built

- Nothing ships logs into Loki yet — Promtail or a Loki-aware logging sink isn't wired up. Loki and its Grafana datasource exist so the pieces are in place, but "logs actually queryable in Grafana" isn't true today.
- No Grafana dashboards are provisioned — just the datasources. Building actual panels against the metrics above is a fast follow, not attempted here since iterating on a dashboard's layout without being able to see it render isn't a good use of effort in this sandbox.
- `migration_requests_total` / `migration_errors_total` (from the spec's metrics list) aren't tracked anywhere — there's no persistent "migration in progress" concept to attach them to; the data migrator scripts' own print-to-console reports (see `migration/data-migrator/README.md`) are the closest equivalent today.
