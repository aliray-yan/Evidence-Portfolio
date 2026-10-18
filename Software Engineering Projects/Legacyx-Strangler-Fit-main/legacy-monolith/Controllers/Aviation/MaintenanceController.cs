using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `maintenance` domain — mirrors
// services/fleet-service's /api/aviation/maintenance routes. Same FastAPI
// conventions as AircraftController (see the note there): {"detail": ...}
// error bodies, 201 with no Location.
[ApiController]
[Route("api/aviation/maintenance")]
public class MaintenanceController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public MaintenanceController(LegacyDbContext db)
    {
        _db = db;
    }

    // Newest first — fleet-service orders by maintenance_date desc, and an
    // unordered list here would come back in whatever order Postgres feels
    // like, which is a visible difference on any aircraft with more than
    // one log entry.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaintenanceLog>>> GetAll()
    {
        return await _db.MaintenanceLogs.AsNoTracking()
            .OrderByDescending(m => m.MaintenanceDate)
            .ToListAsync();
    }

    // The tail-number check is here because aircraft and maintenance logs
    // live in the SAME service on the modern side, so fleet-service can and
    // does validate it (400 Unknown tail_number). Contrast
    // FlightsController, which deliberately does NOT check that its routeId
    // exists: on the modern side that would be a cross-service lookup, and
    // the extracted service doesn't do one. The monolith has every table in
    // one database and could check anything — following the service
    // boundary instead of the database boundary is what keeps the two sides
    // interchangeable.
    //
    // MaintenanceDate is server-stamped (entity default DateTime.UtcNow),
    // not client-settable, so a log entry can't be backdated.
    [HttpPost]
    public async Task<ActionResult<MaintenanceLog>> Create(CreateMaintenanceLogRequest request)
    {
        if (!await _db.Aircraft.AnyAsync(a => a.TailNumber == request.TailNumber))
            return BadRequest(new { detail = "Unknown tail_number" });

        var entry = new MaintenanceLog
        {
            TailNumber = request.TailNumber,
            ActionDescription = request.ActionDescription,
            ClearedByInspectorId = request.ClearedByInspectorId
        };
        _db.MaintenanceLogs.Add(entry);
        await _db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, entry);
    }
}
