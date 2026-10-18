namespace LegacyMonolith.Models;

// Field names intentionally match the legacy shape documented in
// docs/architecture/overview.md's anti-corruption layer example.
public class Customer
{
    public int Id { get; set; }
    public string CustomerNo { get; set; } = string.Empty;   // e.g. "C001"
    public string CustomerName { get; set; } = string.Empty;
    public string CustStatus { get; set; } = "A";             // "A" active, "I" inactive
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
