# Disaster recovery

Not covered elsewhere in this doc set — what happens when each piece fails, and what actually recovers automatically versus what needs a human.

## A modern service goes down (e.g. customer-service crashes)

**Automatic**: the gateway's circuit breaker for that backend opens after 3 consecutive failures and starts failing fast (verified live, `resilience.md`) — callers get an immediate, clear 503 instead of hanging. Once the service comes back, the breaker's half-open trial closes it automatically.

**Manual**: nothing routes traffic back to legacy automatically — if you want customer traffic served while `customer-service` is down and being fixed, someone needs to `PUT /admin/routing/customer {"mode":"legacy"}`. Since legacy's data was never deleted (`data-architecture.md`), this is safe as long as the legacy monolith itself is healthy.

## The legacy monolith goes down

More serious than a modern service going down — it's still the sole implementation for Payments, Reports, and Notifications, and the rollback target for everything else. No automatic mitigation exists at that layer today; this is the single biggest structural risk in the current architecture, worth stating plainly rather than glossing over. A more mature version would run the monolith with multiple replicas behind a load balancer — not attempted here, this project runs one instance of everything.

## The gateway itself goes down

Total outage — every domain routes through it, there's no fallback path that bypasses it. `docker-compose.yml` doesn't configure automatic restart policies (`restart: unless-stopped` or similar isn't set on any service) — recovering from a crashed gateway means someone runs `docker compose up gateway` again. This is a real, unaddressed single point of failure; documented rather than pretending the circuit breaker (which only protects gateway→backend calls, not client→gateway) covers it.

## A database goes down

Its owning service starts failing (EF Core / Hibernate connection errors) — the gateway's circuit breaker for that domain opens the same way as if the service itself had crashed, since from the gateway's perspective a service returning 500s and a service being unreachable look similar enough to trip the same mechanism. Postgres data itself isn't backed up anywhere in this setup — `docker-compose.yml`'s named volumes (`legacy-db-data`, `customer-db-data`, etc.) persist across container restarts but aren't snapshotted or exported anywhere. Losing a volume loses that database's data permanently in this configuration.

## Kafka goes down

The best-protected failure mode in this system, structurally: the transactional outbox pattern (`event-architecture.md`) means Order Service keeps writing orders and outbox rows normally even if Kafka is unreachable — the `OutboxPublisher` just accumulates a backlog and catches up once Kafka's back. No orders are lost; notifications and inventory reservations are simply delayed, not dropped, as long as Kafka eventually recovers with its data intact.

## What a real disaster-recovery plan would add

- Automated backups for all four Postgres databases, with a tested restore procedure.
- `restart:` policies in `docker-compose.yml` so a crashed container comes back without manual intervention.
- Multi-replica deployment for the gateway and legacy-monolith specifically, since both are currently single points of failure.
- A documented RTO/RPO target — none is defined here, because this is a local demo environment, not a production deployment with actual availability commitments.
