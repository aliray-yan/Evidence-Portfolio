using DotNetMastery.Api.Data;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AchievementsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var achievements = await db.Achievements.AsNoTracking().OrderBy(x => x.Title).ToListAsync();
        return Ok(achievements);
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var userId = User.GetUserId();
        var unlocked = await db.UserAchievements
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new
            {
                x.Id,
                x.UnlockedAt,
                Achievement = x.Achievement
            })
            .ToListAsync();
        return Ok(unlocked);
    }
}
