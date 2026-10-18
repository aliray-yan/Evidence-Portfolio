using DotNetMastery.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LessonsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLessons([FromQuery] Guid? moduleId, [FromQuery] int take = 50)
    {
        var query = db.Lessons.AsNoTracking();
        if (moduleId is not null)
        {
            query = query.Where(x => x.ModuleId == moduleId);
        }

        var lessons = await query
            .Take(Math.Clamp(take, 1, 200))
            .Select(x => new
            {
                x.Id,
                x.ModuleId,
                ModuleTitle = x.Module!.Title,
                LevelTitle = x.Module.Level!.Title,
                x.Title,
                x.Slug,
                x.Difficulty,
                x.EstimatedMinutes,
                x.Tags
            })
            .ToListAsync();

        return Ok(lessons);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var lesson = await db.Lessons
            .AsNoTracking()
            .Where(x => x.Slug == slug)
            .Select(x => new
            {
                x.Id,
                x.ModuleId,
                ModuleTitle = x.Module!.Title,
                LevelId = x.Module.LevelId,
                LevelTitle = x.Module.Level!.Title,
                x.Title,
                x.Slug,
                x.Difficulty,
                x.EstimatedMinutes,
                x.SimpleExplanation,
                x.Eli10Explanation,
                x.Analogy,
                x.WhyItMatters,
                x.CodeExample,
                x.LineByLineExplanation,
                x.CommonMistakes,
                x.MiniPracticeTask,
                x.Summary,
                x.NextLessonId,
                NextLessonSlug = x.NextLesson != null ? x.NextLesson.Slug : null,
                NextLessonTitle = x.NextLesson != null ? x.NextLesson.Title : null,
                x.Tags
            })
            .FirstOrDefaultAsync();

        return lesson is null ? NotFound() : Ok(lesson);
    }

    [HttpGet("id/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var lesson = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return lesson is null ? NotFound() : Ok(lesson);
    }
}
