namespace BookingService.Events;

public record EventEnvelope(
    string EventId,
    string EventType,
    DateTime Timestamp,
    string CorrelationId,
    string Source,
    int Version,
    object Data
);
