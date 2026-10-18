using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;
using LegacyMonolith.Services;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `crew` domain — mirrors services/crew-service's
// /api/aviation/crew routes in main.py. FastAPI conventions, same as the
// fleet domains: {"detail": ...} error bodies, 201 with no Location.
[ApiController]
[Route("api/aviation/crew")]
public class CrewController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public CrewController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CrewMember>>> GetAll()
    {
        return await _db.CrewMembers.AsNoTracking().ToListAsync();
    }

    [HttpGet("{crewId:guid}")]
    public async Task<ActionResult<CrewMember>> GetById(Guid crewId)
    {
        var crew = await _db.CrewMembers.AsNoTracking().FirstOrDefaultAsync(c => c.CrewId == crewId);
        if (crew is null) return NotFound(new { detail = "Not found" });
        return crew;
    }

    [HttpPost]
    public async Task<ActionResult<CrewMember>> Create(CreateCrewMemberRequest request)
    {
        var crew = new CrewMember
        {
            FullName = request.FullName,
            Role = request.Role!.Value,
            MedicalClearanceExpiry = UtcTime.Normalize(request.MedicalClearanceExpiry!.Value)
        };
        _db.CrewMembers.Add(crew);
        await _db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, crew);
    }
}
