using DotNetMastery.Api.Data;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/guided-projects")]
public class GuidedProjectsController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid? moduleId)
    {
        var query = db.GuidedProjects.AsNoTracking();
        if (moduleId is not null)
        {
            query = query.Where(x => x.ModuleId == moduleId);
        }

        var projects = await query
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.ModuleId,
                ModuleTitle = x.Module!.Title,
                x.Title,
                x.Difficulty,
                x.Description,
                x.Requirements,
                x.Steps,
                x.ExpectedResult,
                x.StarterCode,
                x.FinalCode,
                x.Explanation,
                x.ExtensionIdeas
            })
            .ToListAsync();

        return Ok(projects);
    }

    [Authorize]
    [HttpPost("{id:guid}/opened")]
    public async Task<IActionResult> MarkOpened(Guid id)
    {
        if (!await db.GuidedProjects.AnyAsync(x => x.Id == id))
        {
            return NotFound();
        }

        await achievements.UnlockByConditionAsync(User.GetUserId(), "view_project");
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> MarkComplete(Guid id)
    {
        if (!await db.GuidedProjects.AnyAsync(x => x.Id == id))
        {
            return NotFound();
        }

        await achievements.UnlockByConditionAsync(User.GetUserId(), "complete_project");
        return NoContent();
    }
}
