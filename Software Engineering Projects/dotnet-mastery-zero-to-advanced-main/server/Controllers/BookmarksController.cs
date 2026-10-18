using DotNetMastery.Api.Data;
using DotNetMastery.Api.Models;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BookmarksController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.GetUserId();
        var bookmarks = await db.Bookmarks
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.LessonId,
                x.CreatedAt,
                LessonTitle = x.Lesson!.Title,
                LessonSlug = x.Lesson.Slug,
                ModuleTitle = x.Lesson.Module!.Title
            })
            .ToListAsync();

        return Ok(bookmarks);
    }

    [HttpPost("{lessonId:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid lessonId)
    {
        var userId = User.GetUserId();
        var existing = await db.Bookmarks.FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        if (existing is not null)
        {
            db.Bookmarks.Remove(existing);
            await db.SaveChangesAsync();
            return Ok(new { bookmarked = false });
        }

        if (!await db.Lessons.AnyAsync(x => x.Id == lessonId))
        {
            return NotFound();
        }

        db.Bookmarks.Add(new Bookmark { UserId = userId, LessonId = lessonId });
        await db.SaveChangesAsync();
        await achievements.UnlockByConditionAsync(userId, "create_bookmark");
        return Ok(new { bookmarked = true });
    }
}
