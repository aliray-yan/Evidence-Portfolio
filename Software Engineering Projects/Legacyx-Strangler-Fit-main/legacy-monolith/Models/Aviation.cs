using System.Text.Json.Serialization;

namespace LegacyMonolith.Models;

// Aviation tenant's tables, seeded into the shared monolith to represent
// the "before" state — same pattern as Customer/Order/Product above.
// Cross-domain references (e.g. Booking.FlightId) are plain business
// keys, not EF foreign keys, matching the existing convention: these
// pairs are about to split into six separate microservices, one per
// comment block below, and only same-service pairs get a real
// relationship configured in OnModelCreating.

public enum LoyaltyTier { Silver, Gold, Platinum }
public enum AircraftStatus { Active, Grounded, InMaintenance }
public enum FlightState { Scheduled, Boarding, Airborne, Landed, Delayed }
public enum BookingState { Pending, Confirmed, Cancelled }
public enum FareClass { Economy, Business, First }
public enum CrewRole { Captain, FirstOfficer, FlightAttendant }
public enum BaggageLocation { CheckedIn, ScannedAtGate, Loaded, Claimed }

// --- Domain 1: Passenger & Loyalty ---
public class Passenger
{
    public Guid PassengerId { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    // Never store the raw passport number — only a salted SHA-256 hash.
    // Nothing downstream needs to recover the original value, only to
    // verify a match against it.
    //
    // [JsonIgnore] because this entity is returned directly from
    // PassengersController: the hash is PII-derived and no client needs it,
    // and passenger-service's Passenger.java annotates the same field the
    // same way. Without this, the legacy and modern responses for
    // GET /api/passengers would differ by one field — visible proof of
    // which side of the toggle answered.
    [JsonIgnore]
    public string PassportNumberHash { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    // Emitted as "1990-01-01", matching passenger-service's LocalDate —
    // see Services/IsoDateConverter.cs.
    [JsonConverter(typeof(Services.IsoDateConverter))]
    public DateTime DateOfBirth { get; set; }
}

public class LoyaltyAccount
{
    public Guid AccountId { get; set; } = Guid.NewGuid();
    public Guid PassengerId { get; set; }
    public LoyaltyTier TierLevel { get; set; } = LoyaltyTier.Silver;
    public int MilesBalance { get; set; }
}

// --- Domain 2: Fleet & Maintenance ---
public class Aircraft
{
    public string TailNumber { get; set; } = string.Empty; // PK
    public string Model { get; set; } = string.Empty;
    public int MaxCapacity { get; set; }
    public AircraftStatus Status { get; set; } = AircraftStatus.Active;
}

public class MaintenanceLog
{
    public Guid LogId { get; set; } = Guid.NewGuid();
    public string TailNumber { get; set; } = string.Empty;
    public DateTime MaintenanceDate { get; set; } = DateTime.UtcNow;
    public string ActionDescription { get; set; } = string.Empty;
    public string ClearedByInspectorId { get; set; } = string.Empty;
}

// --- Domain 3: Flight Scheduling ---
// Named FlightRoute, not Route — "Route" collides with
// Microsoft.AspNetCore.Routing.Route, pulled in by this project's
// implicit global usings.
public class FlightRoute
{
    public string RouteId { get; set; } = string.Empty; // PK, e.g. "LHR-JFK"
    public string OriginAirport { get; set; } = string.Empty;
    public string DestinationAirport { get; set; } = string.Empty;
    public int DistanceMiles { get; set; }
}

public class Flight
{
    public Guid FlightId { get; set; } = Guid.NewGuid();
    public string RouteId { get; set; } = string.Empty;
    public string TailNumber { get; set; } = string.Empty;
    public DateTime ScheduledDeparture { get; set; }
    public FlightState Status { get; set; } = FlightState.Scheduled;
}

// --- Domain 4: Booking & Ticketing ---
public class Booking
{
    public Guid BookingId { get; set; } = Guid.NewGuid();
    public Guid PassengerId { get; set; }
    public Guid FlightId { get; set; }
    public BookingState Status { get; set; } = BookingState.Pending;
}

public class Ticket
{
    public Guid TicketId { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public FareClass FareClass { get; set; } = FareClass.Economy;
    public decimal PricePaid { get; set; }
}

// --- Domain 5: Crew Management ---
public class CrewMember
{
    public Guid CrewId { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public CrewRole Role { get; set; }
    public DateTime MedicalClearanceExpiry { get; set; }
}

public class FlightAssignment
{
    public Guid AssignmentId { get; set; } = Guid.NewGuid();
    public Guid FlightId { get; set; }
    public Guid CrewId { get; set; }
    public decimal LoggedDutyHours { get; set; }
}

// --- Domain 6: Baggage & Freight ---
public class BaggageItem
{
    public string TagId { get; set; } = string.Empty; // PK
    public Guid PassengerId { get; set; }
    public Guid FlightId { get; set; }
    public decimal WeightKg { get; set; }
    public BaggageLocation Status { get; set; } = BaggageLocation.CheckedIn;
}
