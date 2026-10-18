using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `tickets` domain — mirrors services/booking-service's
// TicketsController.
//
// Read-only, for the same reason it is there: a ticket only ever comes
// into existence through AviationBookingsController.Confirm, in the same
// transaction that confirms its booking. Exposing a POST here would let a
// caller mint a ticket with no booking behind it.
[ApiController]
[Route("api/aviation/tickets")]
public class AviationTicketsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public AviationTicketsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ticket>>> GetAll()
    {
        return await _db.Tickets.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Ticket>> GetById(Guid id)
    {
        var ticket = await _db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.TicketId == id);
        if (ticket is null) return NotFound();
        return ticket;
    }
}
