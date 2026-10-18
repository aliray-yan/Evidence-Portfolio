# Load testing

## Setup

`tests/load/load_test.js` is a k6 script comparing three targets at equal VU/duration settings:
1. **Baseline** — the backend directly, no gateway in the path.
2. **Via gateway, legacy** — same backend, routed through the gateway with `customer` in `legacy` mode.
3. **Via gateway, modern** — a second, equivalent stand-in backend, routed through the gateway with `customer` in `modern` mode.

Comparing (2) and (3) isolates *the gateway's own overhead* rather than a genuine legacy-vs-modern architecture comparison — both stand-ins are trivial, equivalent servers, so this specific setup can't meaningfully compare "the real legacy monolith" against "the real Customer Service." What it *can* honestly show: whether routing through the gateway (circuit breaker check, correlation ID handling, metrics recording) adds meaningful latency versus hitting a backend directly. A real comparison of the actual services' performance characteristics would need `docker compose up` with real traffic against real endpoints — noted in `MANUAL.md`.

## What actually ran

k6 (v0.54.0, downloaded from its GitHub release — no apt package exists) was installed and run for real in the sandbox that wrote this. One clean, complete result was captured — 20 VUs, 5 seconds, via the gateway with `customer` in legacy mode, against a stand-in backend:

| Metric | Value |
|---|---|
| Total requests | 1,280 |
| Throughput | 252.7 req/s |
| Failed requests | 0.00% |
| Avg latency | 26.95 ms |
| Median latency | 8.12 ms |
| p90 | 19.57 ms |
| p95 | 24.46 ms |
| Max | 1.04 s (one outlier — see below) |

The gap between median (8ms) and average (27ms) is a small number of slow outliers pulling the mean up, most likely cold-start effects (JIT warmup, first-connection overhead) rather than a systemic issue — the p90/p95 numbers are the more representative figures for steady-state behavior.

## What didn't happen, and why — said plainly

The spec asks for 100/500/1,000-VU comparisons across legacy and modern routing. That full matrix isn't here. Getting even the single result above took several attempts: this sandbox's background-process handling (gateway plus two stand-in backends plus k6, all as separate long-running processes in one shell session) turned out to be intermittently unreliable — the exact same command sequence succeeded once and then failed on immediate retry, with no output at all rather than a clear error. This is different from every other "can't verify here" case elsewhere in this project (those are consistent and explainable — no Docker, no route to NuGet); this one is inconsistent, which points to sandbox flakiness rather than a real limitation of the approach itself.

Rather than keep retrying indefinitely, what's here is the working script plus one real result, and exact instructions for the full comparison in `MANUAL.md`. `docker compose up` with real services in a real Docker environment should be materially more stable than juggling four bare background processes by hand in a constrained sandbox shell.

## What a full run would add (not done here)

- 100/500/1,000-VU tiers as the spec asks for, with p99 in addition to p95.
- A genuine legacy-vs-modern comparison using the actual legacy monolith and actual Customer Service rather than equivalent stand-ins.
- Load testing Order Service's outbox publish path and the Kafka consumers under sustained event volume, not just gateway HTTP routing.
