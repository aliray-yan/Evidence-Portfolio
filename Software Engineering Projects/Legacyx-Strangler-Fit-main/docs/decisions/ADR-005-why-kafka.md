# ADR-005: Kafka for cross-service events

## Status
Accepted

## Context
Once Inventory is extracted (Phase 7), something needs to react to new orders (reserve stock) alongside something that already reacts to them (notification-service, Phase 6). A direct HTTP call from Order Service to each interested party would mean Order Service knowing about, and depending on the uptime of, every consumer — the opposite of the decoupling this whole project is about.

## Decision
Order Service publishes `OrderCreated` to Kafka via the transactional outbox pattern (`event-architecture.md`) and knows nothing about who's listening. notification-service and inventory-service both subscribe independently.

## Alternatives considered
- **Direct synchronous calls from Order Service to each consumer** — rejected. Couples Order Service's uptime to every consumer's uptime, and adding a new consumer means changing Order Service's code.
- **A simpler message queue instead of Kafka** — considered, but Kafka's the spec's explicit ask and the one enterprises overwhelmingly reach for in practice, so it's the more representative choice for a portfolio piece.

## Consequences
- Real infrastructure cost: Kafka in `docker-compose.yml`, no non-Docker way to run it, no apt package (see `MANUAL.md`).
- Proven value, not just infrastructure for its own sake: inventory-service's consumer was added in Phase 7 with zero changes to Order Service or notification-service — see `event-architecture.md` for how this was actually demonstrated, not just claimed.
- Eventual consistency, not immediate: a reservation happens shortly after an order, not atomically with it. Acceptable here; wouldn't be for every domain.
