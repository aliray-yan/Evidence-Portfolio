using DotNetMastery.Api.Data;
using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Models;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotesController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.GetUserId();
        var notes = await db.Notes
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new
            {
                x.Id,
                x.LessonId,
                LessonTitle = x.Lesson!.Title,
                LessonSlug = x.Lesson.Slug,
                x.Content,
                x.UpdatedAt
            })
            .ToListAsync();

        return Ok(notes);
    }

    [HttpGet("{lessonId:guid}")]
    public async Task<IActionResult> Get(Guid lessonId)
    {
        var userId = User.GetUserId();
        var note = await db.Notes.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        return note is null ? Ok(new { lessonId, content = "" }) : Ok(note);
    }

    [HttpPut("{lessonId:guid}")]
    public async Task<IActionResult> Save(Guid lessonId, NoteRequest request)
    {
        var userId = User.GetUserId();
        var note = await db.Notes.FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        if (note is null)
        {
            if (!await db.Lessons.AnyAsync(x => x.Id == lessonId))
            {
                return NotFound();
            }

            note = new Note { UserId = userId, LessonId = lessonId };
            db.Notes.Add(note);
        }

        note.Content = request.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await achievements.UnlockByConditionAsync(userId, "save_note");
        return Ok(note);
    }

    [HttpDelete("{lessonId:guid}")]
    public async Task<IActionResult> Delete(Guid lessonId)
    {
        var userId = User.GetUserId();
        var note = await db.Notes.FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        if (note is null)
        {
            return NoContent();
        }

        db.Notes.Remove(note);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
