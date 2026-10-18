using DotNetMastery.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] string? type)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Ok(new { lessons = Array.Empty<object>(), modules = Array.Empty<object>(), projects = Array.Empty<object>(), exercises = Array.Empty<object>() });
        }

        var term = q.Trim().ToLowerInvariant();
        var includeAll = string.IsNullOrWhiteSpace(type) || type.Equals("all", StringComparison.OrdinalIgnoreCase);

        object lessons = includeAll || type == "lessons"
            ? await db.Lessons.AsNoTracking()
                .Where(x => x.Title.ToLower().Contains(term) || x.SimpleExplanation.ToLower().Contains(term) || x.Tags.Any(t => t.ToLower().Contains(term)))
                .Take(20)
                .Select(x => new { x.Id, x.Title, x.Slug, x.Difficulty, x.EstimatedMinutes, Type = "lesson" })
                .ToListAsync()
            : Array.Empty<object>();

        object modules = includeAll || type == "modules"
            ? await db.Modules.AsNoTracking()
                .Where(x => x.Title.ToLower().Contains(term) || x.Description.ToLower().Contains(term))
                .Take(20)
                .Select(x => new { x.Id, x.Title, x.Difficulty, Type = "module" })
                .ToListAsync()
            : Array.Empty<object>();

        object projects = includeAll || type == "projects"
            ? await db.GuidedProjects.AsNoTracking()
                .Where(x => x.Title.ToLower().Contains(term) || x.Description.ToLower().Contains(term))
                .Take(20)
                .Select(x => new { x.Id, x.Title, x.Difficulty, Type = "project" })
                .ToListAsync()
            : Array.Empty<object>();

        object exercises = includeAll || type == "exercises"
            ? await db.PracticeExercises.AsNoTracking()
                .Where(x => x.Title.ToLower().Contains(term) || x.ProblemStatement.ToLower().Contains(term))
                .Take(20)
                .Select(x => new { x.Id, x.Title, x.Difficulty, Type = "exercise" })
                .ToListAsync()
            : Array.Empty<object>();

        return Ok(new { lessons, modules, projects, exercises });
    }
}
