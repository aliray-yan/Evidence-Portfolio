using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingService.Data;
using BookingService.Models;

namespace BookingService.Controllers;

// Read-only — tickets are only ever created via BookingsController.Confirm,
// which keeps a ticket's existence guaranteed consistent with its booking.
[ApiController]
[Route("api/aviation/tickets")]
public class TicketsController : ControllerBase
{
    private readonly BookingDbContext _db;

    public TicketsController(BookingDbContext db)
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
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket is null) return NotFound();
        return ticket;
    }
}
