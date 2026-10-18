using System.ComponentModel.DataAnnotations;

namespace LegacyMonolith.Models;

// Request DTOs for the aviation controllers. Same two rules as
// Requests.cs, for the same reasons: never bind an entity straight from a
// request body (mass assignment), and put validation attributes on the
// record's constructor parameters, never `[property: ...]`.
//
// Beyond that there's a third rule specific to these: every limit below
// matches the corresponding extracted service field-for-field —
// services/passenger-service's CreatePassengerRequest, fleet-service's
// schemas.py, flight-scheduling-service's CreateRouteRequest,
// booking-service's and baggage-service's Requests.cs. Once a domain can
// be toggled between this monolith and its service, a caller must not be
// able to tell which side answered, and that includes which request
// bodies get a 400.
//
// That last rule is why every enum, timestamp and Guid below is declared
// NULLABLE with [Required], which looks redundant but isn't:
// [Required] on a non-nullable value type can never fail, because an
// omitted JSON field binds to default(T) rather than null. A PUT
// .../status with an empty body would then quietly mean "Active" /
// "Scheduled" / "CheckedIn" (the zero-valued enum member) instead of
// returning 400 — which is both a mass-assignment foothold and a
// divergence from the Java and Python services, where an absent field
// deserialises to null and @NotNull / Pydantic rejects it. Nullable +
// [Required] makes the two sides reject exactly the same bodies.
//
// Server-managed fields are absent from every DTO here, exactly as they
// are on the modern side: MilesBalance and TierLevel (moved only by the
// TicketIssuedEvent consumer), LoggedDutyHours (only by the
// FlightDepartedEvent consumer), the four Status fields (only via their
// own transition endpoints), and every primary key.

// --- Domain 1: Passenger & Loyalty ---

public record CreatePassengerRequest(
    [Required, StringLength(200)] string FullName,
    // Accepted, hashed, then dropped — never persisted or returned.
    [Required, StringLength(50, MinimumLength = 4)] string PassportNumber,
    [Required, StringLength(100)] string Nationality,
    // DateOnly, not DateTime, so System.Text.Json accepts only
    // "1990-01-01" and rejects "1990-01-01T00:00:00Z" — the exact
    // behaviour of Jackson's LocalDate deserializer on the modern side.
    [Required, PastDate] DateOnly? DateOfBirth
);

public record EnrollLoyaltyRequest(
    [Required] Guid? PassengerId
);

// --- Domain 2: Fleet & Maintenance ---

public record CreateAircraftRequest(
    [Required, StringLength(20)] string TailNumber,
    [Required, StringLength(100)] string Model,
    [Range(1, int.MaxValue)] int MaxCapacity
);

public record UpdateAircraftStatusRequest(
    [Required] AircraftStatus? Status
);

public record CreateMaintenanceLogRequest(
    [Required, StringLength(20)] string TailNumber,
    [Required, StringLength(2000)] string ActionDescription,
    [Required, StringLength(100)] string ClearedByInspectorId
);

// --- Domain 3: Flight Scheduling ---

public record CreateFlightRouteRequest(
    [Required, RegularExpression("[A-Z0-9-]{3,20}")] string RouteId,
    [Required, RegularExpression("[A-Z]{3}")] string OriginAirport,
    [Required, RegularExpression("[A-Z]{3}")] string DestinationAirport,
    [Range(1, int.MaxValue)] int DistanceMiles
);

public record CreateFlightRequest(
    [Required] string RouteId,
    [Required] string TailNumber,
    [Required] DateTime? ScheduledDeparture
);

public record UpdateFlightStatusRequest(
    [Required] FlightState? Status
);

// --- Domain 4: Booking & Ticketing ---

public record CreateAviationBookingRequest(
    [Required] Guid? PassengerId,
    [Required] Guid? FlightId
);

public record ConfirmBookingRequest(
    [Required, StringLength(10)] string SeatNumber,
    [Required] FareClass? FareClass,
    [Range(0.01, 1_000_000)] decimal PricePaid
);

// --- Domain 5: Crew Management ---

public record CreateCrewMemberRequest(
    [Required, StringLength(200)] string FullName,
    [Required] CrewRole? Role,
    [Required] DateTime? MedicalClearanceExpiry
);

public record CreateFlightAssignmentRequest(
    [Required] Guid? FlightId,
    [Required] Guid? CrewId
);

// --- Domain 6: Baggage & Freight ---

public record CreateBaggageItemRequest(
    [Required, StringLength(20)] string TagId,
    [Required] Guid? PassengerId,
    [Required] Guid? FlightId,
    [Range(0.01, 200)] decimal WeightKg
);

public record UpdateBaggageStatusRequest(
    [Required] BaggageLocation? Status
);

// DataAnnotations has no equivalent of Jakarta Validation's @Past, which
// services/passenger-service applies to this exact field. A short
// attribute keeps the check declarative and the 400 automatic
// ([ApiController] handles the response) instead of scattering an
// if-statement into the controller.
public sealed class PastDateAttribute : ValidationAttribute
{
    public PastDateAttribute() : base("The {0} field must be a date in the past.") { }

    // Null passes, matching @Past — absence is [Required]'s job, not this
    // attribute's. Handles DateOnly (Passenger.DateOfBirth) and DateTime
    // so the attribute stays usable if another past-only field appears.
    public override bool IsValid(object? value) => value switch
    {
        DateOnly date => date < DateOnly.FromDateTime(DateTime.UtcNow),
        DateTime timestamp => Services.UtcTime.Normalize(timestamp) < DateTime.UtcNow,
        _ => true
    };
}
