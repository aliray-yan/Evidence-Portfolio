using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `loyalty` domain — mirrors
// services/passenger-service's LoyaltyController. See
// PassengersController for the parity rule these all follow.
[ApiController]
[Route("api/aviation/loyalty")]
public class LoyaltyController : ControllerBase
{
    private readonly LegacyDbContext _db;

    public LoyaltyController(LegacyDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LoyaltyAccount>>> GetAll()
    {
        return await _db.LoyaltyAccounts.AsNoTracking().ToListAsync();
    }

    [HttpGet("passenger/{passengerId:guid}")]
    public async Task<ActionResult<LoyaltyAccount>> GetByPassenger(Guid passengerId)
    {
        var account = await _db.LoyaltyAccounts.AsNoTracking()
            .FirstOrDefaultAsync(l => l.PassengerId == passengerId);
        if (account is null) return NotFound();
        return account;
    }

    // Enrollment only. MilesBalance starts at 0 and TierLevel at Silver,
    // both server-set — neither is on EnrollLoyaltyRequest, matching the
    // modern side, where miles only ever move via the TicketIssuedEvent
    // consumer. (That consumer lives in passenger-service and reads
    // passenger-service's own database, so miles credited while the domain
    // is routed here won't appear until it's cut back over. Same
    // legacy-has-no-event-producer asymmetry retail already has with
    // OrderCreated; see FlightsController for the other half of it.)
    //
    // The unique index on LoyaltyAccounts.PassengerId means a concurrent
    // duplicate would surface as a DbUpdateException rather than this 409,
    // and the global handler in Program.cs would turn that into a 500. The
    // modern service has exactly the same check-then-insert race, so both
    // sides fail the same way; not worth diverging to fix on one side only.
    [HttpPost]
    public async Task<ActionResult<LoyaltyAccount>> Enroll(EnrollLoyaltyRequest request)
    {
        if (await _db.LoyaltyAccounts.AnyAsync(l => l.PassengerId == request.PassengerId))
            return Conflict();

        var account = new LoyaltyAccount { PassengerId = request.PassengerId!.Value };
        _db.LoyaltyAccounts.Add(account);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetByPassenger), new { passengerId = account.PassengerId }, account);
    }
}
