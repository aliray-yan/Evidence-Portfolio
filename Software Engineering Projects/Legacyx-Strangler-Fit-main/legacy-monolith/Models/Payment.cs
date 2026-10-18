namespace LegacyMonolith.Models;

// Simulated payments only. No real payment provider is ever contacted,
// and no real money moves — see docs/architecture/overview.md.
public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "PENDING";   // PENDING, COMPLETED, FAILED
    public string Method { get; set; } = "SIMULATED";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
