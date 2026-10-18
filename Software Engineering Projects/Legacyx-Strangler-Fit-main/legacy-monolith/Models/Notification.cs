namespace LegacyMonolith.Models;

// Simulated delivery only — this logs notifications rather than sending
// real email/SMS. See docs/architecture/overview.md.
public class Notification
{
    public int Id { get; set; }
    public int? CustomerId { get; set; }
    public string Channel { get; set; } = "EMAIL";   // EMAIL, SMS
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "SIMULATED_SENT";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
