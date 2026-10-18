using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `assignments` domain — mirrors services/crew-service's
// /api/aviation/assignments routes. FastAPI conventions (see
// CrewController).
[ApiController]
[Route("api/aviation/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public AssignmentsController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FlightAssignment>>> GetAll()
    {
        return await _db.FlightAssignments.AsNoTracking().ToListAsync();
    }

    // CrewId is checked (crew and assignments share crew-service on the
    // modern side, so it checks too) but FlightId is not (flights live in
    // flight-scheduling-service, a cross-service lookup crew-service
    // doesn't make). Following the service boundary, not the database
    // boundary — see MaintenanceController for the longer version.
    //
    // LoggedDutyHours is absent from the DTO: it starts at 0 and only ever
    // moves via crew-service's FlightDepartedEvent consumer.
    [HttpPost]
    public async Task<ActionResult<FlightAssignment>> Create(CreateFlightAssignmentRequest request)
    {
        if (!await _db.CrewMembers.AnyAsync(c => c.CrewId == request.CrewId))
            return BadRequest(new { detail = "Unknown crew_id" });

        var assignment = new FlightAssignment
        {
            FlightId = request.FlightId!.Value,
            CrewId = request.CrewId!.Value
        };
        _db.FlightAssignments.Add(assignment);
        await _db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, assignment);
    }
}
