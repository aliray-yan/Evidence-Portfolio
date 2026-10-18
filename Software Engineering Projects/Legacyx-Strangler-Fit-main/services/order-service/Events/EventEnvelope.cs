namespace OrderService.Events;

// Matches docs/architecture/event-architecture.md exactly — any future
// event type from any service should serialize to this same shape.
public record EventEnvelope(
    string EventId,
    string EventType,
    DateTime Timestamp,
    string CorrelationId,
    string Source,
    int Version,
    object Data
);
