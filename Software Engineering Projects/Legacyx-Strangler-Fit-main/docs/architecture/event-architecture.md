# Event architecture

## Why

Direct synchronous calls between services (Order Service calling Inventory, calling Notification, ...) couple their uptimes together and make the migration harder to extend. Kafka lets a service publish "this happened" and move on, with whoever cares listening independently.

## The envelope

Every event uses the same shape, matching the original spec:

```json
{
  "eventId": "b3f1...",
  "eventType": "OrderCreated",
  "timestamp": "2026-08-14T12:00:00Z",
  "correlationId": "9a2e...",
  "source": "order-service",
  "version": 1,
  "data": { }
}
```

`data` is event-type-specific. For `OrderCreated`:
```json
{
  "orderId": 1,
  "orderNo": "O20260814120000000",
  "customerNo": "C001",
  "totalAmount": 49.48,
  "items": [{ "sku": "SKU-001", "quantity": 2, "unitPrice": 19.99 }]
}
```

## What's actually implemented vs. documented

The spec lists ten event types (`CustomerCreated`, `OrderCancelled`, `InventoryReserved`, `PaymentRequested`, ...). Only **`OrderCreated`** is wired end-to-end — producer, topic, consumer. The rest follow the identical envelope and the identical outbox mechanism once their owning service exists or gets a reason to publish; building all ten now, mostly unused, would be scope for its own sake. `legacyx.orders` is the one topic that exists.

## The outbox pattern (Order Service)

Publishing directly to Kafka inside the same request that creates the order risks losing the event if Kafka is briefly unreachable — the order would exist with no one ever told about it. Instead:

1. `POST /api/orders` writes the `Order` **and** an `OutboxMessage` row (event type + JSON payload) in one explicit database transaction — both commit together or neither does.
2. A background service (`OutboxPublisher`, runs inside Order Service) polls for unpublished outbox rows every 2 seconds, publishes each to Kafka, and marks it published — only after a successful publish.
3. If Kafka is down, rows just accumulate unpublished and get picked up once it's back. The order was never at risk of "existing but silently un-eventing."

This is more machinery than a direct publish call, on purpose — it's the actual reason the spec calls for the outbox pattern instead of "just publish after save."

## Consumer: notification-service and inventory-service

Two independent consumers of `legacyx.orders` now, added at different phases without touching Order Service either time — that's the actual point of Kafka here, not just infrastructure box-ticking:

- **notification-service** (Python, Phase 6): logs a simulated notification.
- **inventory-service** (Spring Boot, Phase 7): auto-reserves stock for each ordered SKU via `@KafkaListener`.

Order Service publishes once, with zero knowledge of either. Adding inventory-service's listener required no change to Order Service, no change to notification-service, and no coordination between the two consumers — each just subscribes to the same topic independently.

## Verification reality

No Docker and no installable Kafka broker exist in the sandbox that wrote this, so the actual producer → Kafka → consumer path over the network is **not** live-tested here — that needs `docker compose up`, which needs Docker, which this sandbox doesn't have. What *is* verified: the consumer's event-handling logic itself, decoupled from the Kafka connection (see `services/notification-service/README.md`), and the outbox/publisher code follows a standard, well-known pattern rather than something novel or risky.
