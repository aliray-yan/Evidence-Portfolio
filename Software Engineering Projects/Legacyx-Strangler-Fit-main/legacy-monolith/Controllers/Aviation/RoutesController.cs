using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `routes` domain — mirrors
// services/flight-scheduling-service's RouteController. See
// PassengersController for the parity rule these all follow.
//
// Spring's ResponseEntity.notFound()/status(CONFLICT).build() send an
// empty body, so NotFound()/Conflict() are used bare here — unlike the
// FastAPI-backed domains, which carry a {"detail": ...} body.
//
// The entity is FlightRoute, not Route: "Route" collides with
// Microsoft.AspNetCore.Routing.Route via this project's implicit global
// usings. Only the C# type name differs — the route path, JSON field
// names and status codes are all unchanged.
[ApiController]
[Route("api/aviation/routes")]
public class RoutesController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public RoutesController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FlightRoute>>> GetAll()
    {
        return await _db.Routes.AsNoTracking().ToListAsync();
    }

    [HttpGet("{routeId}")]
    public async Task<ActionResult<FlightRoute>> GetById(string routeId)
    {
        var route = await _db.Routes.AsNoTracking().FirstOrDefaultAsync(r => r.RouteId == routeId);
        if (route is null) return NotFound();
        return route;
    }

    // RouteId is client-supplied here (it's the natural key, e.g.
    // "LHR-JFK") but constrained to [A-Z0-9-]{3,20} by the DTO, the same
    // @Pattern the modern side applies.
    [HttpPost]
    public async Task<ActionResult<FlightRoute>> Create(CreateFlightRouteRequest request)
    {
        if (await _db.Routes.AnyAsync(r => r.RouteId == request.RouteId))
            return Conflict();

        var route = new FlightRoute
        {
            RouteId = request.RouteId,
            OriginAirport = request.OriginAirport,
            DestinationAirport = request.DestinationAirport,
            DistanceMiles = request.DistanceMiles
        };
        _db.Routes.Add(route);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { routeId = route.RouteId }, route);
    }
}
