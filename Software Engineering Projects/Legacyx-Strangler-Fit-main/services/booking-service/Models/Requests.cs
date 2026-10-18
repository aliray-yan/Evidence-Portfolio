using System.ComponentModel.DataAnnotations;

namespace BookingService.Models;

// Attributes go directly on the record's constructor parameters, NOT
// `[property: ...]` — see legacy-monolith/Models/Requests.cs for why
// (ASP.NET Core throws at request time otherwise for record types).

public record CreateBookingRequest(
    [Required] Guid PassengerId,
    [Required] Guid FlightId
);

public record ConfirmBookingRequest(
    [Required, StringLength(10)] string SeatNumber,
    [Required, RegularExpression("Economy|Business|First")] string FareClass,
    [Range(0.01, 1_000_000)] decimal PricePaid
);
