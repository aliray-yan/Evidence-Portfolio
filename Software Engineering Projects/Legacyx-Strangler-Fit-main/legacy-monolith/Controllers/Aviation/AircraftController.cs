using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `aircraft` domain — mirrors services/fleet-service's
// /api/aviation/aircraft routes in main.py. See PassengersController for
// the parity rule these all follow.
//
// fleet-service is FastAPI, so two details differ from the Java- and
// C#-backed domains and are matched deliberately here:
//   * error bodies are FastAPI's {"detail": "..."} shape, not a bare
//     string or an empty body;
//   * POST returns 201 with NO Location header, because FastAPI's
//     status_code=201 doesn't set one. CreatedAtAction would add it and
//     make the two sides distinguishable, so it isn't used.
[ApiController]
[Route("api/aviation/aircraft")]
public class AircraftController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public AircraftController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Aircraft>>> GetAll()
    {
        return await _db.Aircraft.AsNoTracking().ToListAsync();
    }

    [HttpGet("{tailNumber}")]
    public async Task<ActionResult<Aircraft>> GetByTailNumber(string tailNumber)
    {
        var aircraft = await _db.Aircraft.AsNoTracking().FirstOrDefaultAsync(a => a.TailNumber == tailNumber);
        if (aircraft is null) return NotFound(new { detail = "Not found" });
        return aircraft;
    }

    // Status is absent from CreateAircraftRequest — a new airframe is
    // always Active server-side, never client-settable.
    [HttpPost]
    public async Task<ActionResult<Aircraft>> Create(CreateAircraftRequest request)
    {
        if (await _db.Aircraft.AnyAsync(a => a.TailNumber == request.TailNumber))
            return Conflict(new { detail = "Aircraft already exists" });

        var aircraft = new Aircraft
        {
            TailNumber = request.TailNumber,
            Model = request.Model,
            MaxCapacity = request.MaxCapacity
        };
        _db.Aircraft.Add(aircraft);
        await _db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, aircraft);
    }

    // 200 + the updated entity, not 204 — fleet-service declares a
    // response_model on this route. (Baggage's equivalent really is 204;
    // the two aren't consistent with each other on the modern side, so
    // they can't be consistent here either.)
    [HttpPut("{tailNumber}/status")]
    public async Task<ActionResult<Aircraft>> UpdateStatus(string tailNumber, UpdateAircraftStatusRequest request)
    {
        var aircraft = await _db.Aircraft.FindAsync(tailNumber);
        if (aircraft is null) return NotFound(new { detail = "Not found" });

        aircraft.Status = request.Status!.Value;
        await _db.SaveChangesAsync();
        return aircraft;
    }
}
