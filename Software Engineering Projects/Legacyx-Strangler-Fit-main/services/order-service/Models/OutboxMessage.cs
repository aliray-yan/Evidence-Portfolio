namespace OrderService.Models;

// Written in the SAME transaction as the Order it describes — see
// docs/architecture/event-architecture.md for why. PublishedAt stays
// null until OutboxPublisher successfully hands it to Kafka.
public class OutboxMessage
{
    public long Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty; // full envelope, JSON-serialized
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
}
