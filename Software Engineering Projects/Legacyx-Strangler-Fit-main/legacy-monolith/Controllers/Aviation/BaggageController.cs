using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `baggage` domain — mirrors services/baggage-service's
// BaggageController. Both sides are ASP.NET Core, so error bodies match
// exactly with no translation.
[ApiController]
[Route("api/aviation/baggage")]
public class BaggageController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public BaggageController(LegacyDbContext db)
    {
        _db = db;
    }

    // The optional flightId filter is what the dashboard's Gate Check-in
    // panel calls, so it has to exist on both sides.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BaggageItem>>> GetAll([FromQuery] Guid? flightId)
    {
        var query = _db.BaggageItems.AsNoTracking().AsQueryable();
        if (flightId is not null) query = query.Where(b => b.FlightId == flightId);
        return await query.ToListAsync();
    }

    [HttpGet("{tagId}")]
    public async Task<ActionResult<BaggageItem>> GetById(string tagId)
    {
        var item = await _db.BaggageItems.AsNoTracking().FirstOrDefaultAsync(b => b.TagId == tagId);
        if (item is null) return NotFound();
        return item;
    }

    [HttpPost]
    public async Task<ActionResult<BaggageItem>> Create(CreateBaggageItemRequest request)
    {
        if (await _db.BaggageItems.AnyAsync(b => b.TagId == request.TagId))
            return Conflict("TagId already in use.");

        var item = new BaggageItem
        {
            TagId = request.TagId,
            PassengerId = request.PassengerId!.Value,
            FlightId = request.FlightId!.Value,
            WeightKg = request.WeightKg
        };
        _db.BaggageItems.Add(item);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { tagId = item.TagId }, item);
    }

    // 204, no body — baggage-service returns NoContent() here. (Aircraft's
    // status endpoint returns 200 plus the entity; the modern side isn't
    // self-consistent about it, so neither can this be.) The dashboard's
    // GateAgent view relies on the 204 and re-fetches.
    [HttpPut("{tagId}/status")]
    public async Task<IActionResult> UpdateStatus(string tagId, UpdateBaggageStatusRequest request)
    {
        var item = await _db.BaggageItems.FindAsync(tagId);
        if (item is null) return NotFound();

        item.Status = request.Status!.Value;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
