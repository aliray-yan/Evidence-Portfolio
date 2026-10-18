namespace BaggageService.Models;

public class BaggageItem
{
    public string TagId { get; set; } = string.Empty; // PK
    public Guid PassengerId { get; set; }
    public Guid FlightId { get; set; }
    public decimal WeightKg { get; set; }
    public string Status { get; set; } = "CheckedIn"; // CheckedIn, ScannedAtGate, Loaded, Claimed
}
