using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacyMonolith.Data;
using LegacyMonolith.Models;
using LegacyMonolith.Services;

namespace LegacyMonolith.Controllers.Aviation;

// Legacy side of the `passengers` domain.
//
// Every controller under Controllers/Aviation exists so the gateway has a
// real "legacy" target to route each aviation domain to, making the
// cutover/rollback toggle mean something for aviation the way it already
// does for retail. That imposes one rule on all of them: the response a
// caller gets must not reveal which side answered. Same route, same status
// codes, same JSON shape, same validation limits as the extracted service
// — here, services/passenger-service's PassengerController.
//
// Where the two sides genuinely can't match, the divergence is called out
// in a comment rather than left to be discovered.
[ApiController]
[Route("api/aviation/passengers")]
public class PassengersController : ControllerBase
{
    private readonly LegacyDbContext _db;
    private readonly PassportHasher _hasher;

    public PassengersController(LegacyDbContext db, PassportHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Passenger>>> GetAll()
    {
        return await _db.Passengers.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Passenger>> GetById(Guid id)
    {
        var passenger = await _db.Passengers.AsNoTracking().FirstOrDefaultAsync(p => p.PassengerId == id);
        if (passenger is null) return NotFound();
        return passenger;
    }

    // The raw passport number is hashed and then goes out of scope — it is
    // never assigned to the entity, never logged, and never echoed back.
    // PassportNumberHash is [JsonIgnore]d on the entity, so the 201 body
    // here is identical to the modern service's.
    [HttpPost]
    public async Task<ActionResult<Passenger>> Create(CreatePassengerRequest request)
    {
        var passenger = new Passenger
        {
            FullName = request.FullName,
            PassportNumberHash = _hasher.Hash(request.PassportNumber),
            Nationality = request.Nationality,
            // DateOnly -> DateTime for a `timestamp with time zone`
            // column; Npgsql rejects a non-UTC Kind outright.
            DateOfBirth = UtcTime.Normalize(request.DateOfBirth!.Value.ToDateTime(TimeOnly.MinValue))
        };

        _db.Passengers.Add(passenger);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = passenger.PassengerId }, passenger);
    }
}
