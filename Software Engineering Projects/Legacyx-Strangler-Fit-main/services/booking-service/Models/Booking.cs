namespace BookingService.Models;

public class Booking
{
    public Guid BookingId { get; set; } = Guid.NewGuid();
    public Guid PassengerId { get; set; }
    public Guid FlightId { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled
}

public class Ticket
{
    public Guid TicketId { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public string FareClass { get; set; } = "Economy"; // Economy, Business, First
    public decimal PricePaid { get; set; }
}
