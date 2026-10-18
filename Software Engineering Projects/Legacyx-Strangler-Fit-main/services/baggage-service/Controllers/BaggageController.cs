using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaggageService.Data;
using BaggageService.Models;

namespace BaggageService.Controllers;

[ApiController]
[Route("api/aviation/baggage")]
public class BaggageController : ControllerBase
{
    private readonly BaggageDbContext _db;

    public BaggageController(BaggageDbContext db)
    {
        _db = db;
    }

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
        var item = await _db.BaggageItems.FindAsync(tagId);
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
            PassengerId = request.PassengerId,
            FlightId = request.FlightId,
            WeightKg = request.WeightKg
        };
        _db.BaggageItems.Add(item);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { tagId = item.TagId }, item);
    }

    // GateAgent's day-to-day tool — moving a bag through
    // CheckedIn -> ScannedAtGate -> Loaded -> Claimed.
    [HttpPut("{tagId}/status")]
    public async Task<IActionResult> UpdateStatus(string tagId, UpdateBaggageStatusRequest request)
    {
        var item = await _db.BaggageItems.FindAsync(tagId);
        if (item is null) return NotFound();

        item.Status = request.Status;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
