using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `bookings` domain — mirrors
// services/booking-service's BookingsController. Both sides are ASP.NET
// Core here, so the error bodies match exactly (a bare JSON string, from
// Conflict(string)) with no translation needed.
[ApiController]
[Route("api/aviation/bookings")]
public class AviationBookingsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public AviationBookingsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAll()
    {
        return await _db.Bookings.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Booking>> GetById(Guid id)
    {
        var booking = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.BookingId == id);
        if (booking is null) return NotFound();
        return booking;
    }

    // Status is server-set to Pending; a caller can't create a booking
    // that's already Confirmed and skip paying for a ticket.
    [HttpPost]
    public async Task<ActionResult<Booking>> Create(CreateAviationBookingRequest request)
    {
        var booking = new Booking
        {
            PassengerId = request.PassengerId!.Value,
            FlightId = request.FlightId!.Value
        };
        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, booking);
    }

    // Issues the ticket and flips the booking to Confirmed. One
    // SaveChangesAsync covers both writes, so EF wraps them in a single
    // transaction — the explicit BeginTransactionAsync the modern service
    // uses is there because it ALSO writes an outbox row, which this side
    // has no equivalent of.
    //
    // Known asymmetry, deliberate: booking-service emits TicketIssuedEvent
    // via a transactional outbox, and passenger-service consumes it to
    // credit loyalty miles (5 per unit fare). The monolith has no producer,
    // so a ticket issued while `bookings` is routed to legacy credits no
    // miles. Same shape of gap as retail's OrderCreated — see
    // FlightsController and README.md.
    //
    // Returns 201 pointing at the new *ticket*, not the booking, matching
    // the modern service's CreatedAtAction("GetById", "Tickets", ...).
    [HttpPost("{id:guid}/confirm")]
    public async Task<ActionResult<Ticket>> Confirm(Guid id, ConfirmBookingRequest request)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        if (booking.Status != BookingState.Pending) return Conflict($"Booking is already '{booking.Status}'.");

        var ticket = new Ticket
        {
            BookingId = booking.BookingId,
            SeatNumber = request.SeatNumber,
            FareClass = request.FareClass!.Value,
            PricePaid = request.PricePaid
        };
        _db.Tickets.Add(ticket);
        booking.Status = BookingState.Confirmed;
        await _db.SaveChangesAsync();

        return CreatedAtAction("GetById", "AviationTickets", new { id = ticket.TicketId }, ticket);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        if (booking.Status == BookingState.Confirmed)
            return Conflict("Cannot cancel a confirmed booking with an issued ticket.");

        booking.Status = BookingState.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
