using DotNetMastery.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LevelsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLevels()
    {
        var levels = await db.Levels
            .AsNoTracking()
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                x.Order,
                x.Difficulty,
                x.EstimatedHours,
                ModuleCount = x.Modules.Count,
                LessonCount = x.Modules.SelectMany(m => m.Lessons).Count()
            })
            .ToListAsync();

        return Ok(levels);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLevel(Guid id)
    {
        var level = await db.Levels
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                x.Order,
                x.Difficulty,
                x.EstimatedHours,
                Modules = x.Modules.OrderBy(m => m.Order).Select(m => new
                {
                    m.Id,
                    m.Title,
                    m.Description,
                    m.Order,
                    m.Difficulty,
                    LessonCount = m.Lessons.Count
                })
            })
            .FirstOrDefaultAsync();

        return level is null ? NotFound() : Ok(level);
    }
}
