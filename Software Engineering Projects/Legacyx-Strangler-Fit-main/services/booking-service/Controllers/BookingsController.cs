using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingService.Data;
using BookingService.Events;
using BookingService.Models;

namespace BookingService.Controllers;

[ApiController]
[Route("api/aviation/bookings")]
public class BookingsController : ControllerBase
{
    private readonly BookingDbContext _db;

    private static readonly JsonSerializerOptions EventJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public BookingsController(BookingDbContext db)
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
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        return booking;
    }

    [HttpPost]
    public async Task<ActionResult<Booking>> Create(CreateBookingRequest request)
    {
        var booking = new Booking { PassengerId = request.PassengerId, FlightId = request.FlightId };
        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, booking);
    }

    // Issues the ticket and confirms the booking in one transaction, then
    // writes the TicketIssuedEvent outbox row in that SAME transaction —
    // same reasoning as order-service's OrdersController.Create: the
    // event can never drift from the ticket it describes.
    [HttpPost("{id:guid}/confirm")]
    public async Task<ActionResult<Ticket>> Confirm(Guid id, ConfirmBookingRequest request)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        if (booking.Status != "Pending") return Conflict($"Booking is already '{booking.Status}'.");

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ticket = new Ticket
        {
            BookingId = booking.BookingId,
            SeatNumber = request.SeatNumber,
            FareClass = request.FareClass,
            PricePaid = request.PricePaid
        };
        _db.Tickets.Add(ticket);

        booking.Status = "Confirmed";

        var envelope = new EventEnvelope(
            EventId: Guid.NewGuid().ToString(),
            EventType: "TicketIssuedEvent",
            Timestamp: DateTime.UtcNow,
            CorrelationId: Guid.NewGuid().ToString(),
            Source: "booking-service",
            Version: 1,
            Data: new
            {
                bookingId = booking.BookingId,
                ticketId = ticket.TicketId,
                passengerId = booking.PassengerId,
                flightId = booking.FlightId,
                fareClass = ticket.FareClass,
                pricePaid = ticket.PricePaid
            }
        );
        _db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "TicketIssuedEvent",
            Payload = JsonSerializer.Serialize(envelope, EventJsonOptions)
        });

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreatedAtAction("GetById", "Tickets", new { id = ticket.TicketId }, ticket);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        if (booking.Status == "Confirmed") return Conflict("Cannot cancel a confirmed booking with an issued ticket.");

        booking.Status = "Cancelled";
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
