using DotNetMastery.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModulesController(AppDbContext db) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetModule(Guid id)
    {
        var module = await db.Modules
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.LevelId,
                LevelTitle = x.Level!.Title,
                x.Title,
                x.Description,
                x.Order,
                x.Difficulty,
                Lessons = x.Lessons.OrderBy(l => l.Id).Select(l => new
                {
                    l.Id,
                    l.Title,
                    l.Slug,
                    l.Difficulty,
                    l.EstimatedMinutes,
                    l.Tags
                })
            })
            .FirstOrDefaultAsync();

        return module is null ? NotFound() : Ok(module);
    }

    [HttpGet("by-level/{levelId:guid}")]
    public async Task<IActionResult> GetByLevel(Guid levelId)
    {
        var modules = await db.Modules
            .AsNoTracking()
            .Where(x => x.LevelId == levelId)
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.Id,
                x.LevelId,
                x.Title,
                x.Description,
                x.Order,
                x.Difficulty,
                LessonCount = x.Lessons.Count
            })
            .ToListAsync();

        return Ok(modules);
    }
}
