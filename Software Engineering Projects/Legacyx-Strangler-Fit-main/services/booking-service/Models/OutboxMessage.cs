namespace BookingService.Models;

// Written in the SAME transaction as the Booking/Ticket it describes —
// see services/order-service/README.md and docs/architecture/event-architecture.md
// for the reasoning; identical pattern, different domain.
public class OutboxMessage
{
    public long Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
}
