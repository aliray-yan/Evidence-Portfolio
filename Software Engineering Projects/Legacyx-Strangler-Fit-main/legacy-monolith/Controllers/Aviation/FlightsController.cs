using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;
using LegacyMonolith.Services;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `flights` domain — mirrors
// services/flight-scheduling-service's FlightController. Empty-bodied
// 404s, same as RoutesController (Spring convention).
[ApiController]
[Route("api/aviation/flights")]
public class FlightsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public FlightsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Flight>>> GetAll()
    {
        return await _db.Flights.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Flight>> GetById(Guid id)
    {
        var flight = await _db.Flights.AsNoTracking().FirstOrDefaultAsync(f => f.FlightId == id);
        if (flight is null) return NotFound();
        return flight;
    }

    // No existence check on RouteId or TailNumber, on purpose. Routes and
    // flights share a service on the modern side but aircraft don't, and
    // flight-scheduling-service validates neither — so neither does this.
    // Adding a check the modern side lacks would make the toggle
    // observable: the same POST would 400 on legacy and 201 on modern.
    [HttpPost]
    public async Task<ActionResult<Flight>> Create(CreateFlightRequest request)
    {
        var flight = new Flight
        {
            RouteId = request.RouteId,
            TailNumber = request.TailNumber,
            ScheduledDeparture = UtcTime.Normalize(request.ScheduledDeparture!.Value)
        };
        _db.Flights.Add(flight);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = flight.FlightId }, flight);
    }

    // The gateway's PUT /admin/aviation/flights/{id}/status (AVIATION_ADMIN
    // and FlightDispatcher, audited) proxies here whenever `flights` is
    // routed to legacy.
    //
    // Known asymmetry, deliberate: the modern service publishes
    // FlightDepartedEvent on a transition into Airborne, which crew-service
    // consumes to log duty hours. The monolith has no Kafka producer — the
    // event pipeline is one of the things extraction buys you — so a
    // departure recorded while this domain is on legacy credits no duty
    // hours. Retail has exactly the same gap with OrderCreated, and it is
    // the clearest single demonstration of what the cutover is actually
    // for. Documented in README.md rather than papered over.
    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<Flight>> UpdateStatus(Guid id, UpdateFlightStatusRequest request)
    {
        var flight = await _db.Flights.FindAsync(id);
        if (flight is null) return NotFound();

        flight.Status = request.Status!.Value;
        await _db.SaveChangesAsync();
        return flight;
    }
}
