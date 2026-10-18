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
public class ProgressController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var userId = User.GetUserId();
        var totalLessons = await db.Lessons.CountAsync();
        var completedIds = await db.UserProgress
            .Where(x => x.UserId == userId && x.Completed)
            .Select(x => x.LessonId)
            .ToListAsync();

        var completedCount = completedIds.Count;
        var levelProgress = await db.Levels
            .AsNoTracking()
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Order,
                x.Difficulty,
                TotalLessons = x.Modules.SelectMany(m => m.Lessons).Count(),
                CompletedLessons = x.Modules.SelectMany(m => m.Lessons).Count(l => completedIds.Contains(l.Id))
            })
            .ToListAsync();

        var recent = await db.UserProgress
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.Completed)
            .OrderByDescending(x => x.CompletedAt)
            .Take(6)
            .Select(x => new
            {
                x.LessonId,
                x.CompletedAt,
                LessonTitle = x.Lesson!.Title,
                LessonSlug = x.Lesson.Slug,
                ModuleTitle = x.Lesson.Module!.Title
            })
            .ToListAsync();

        var attempts = await db.QuizAttempts
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(8)
            .ToListAsync();

        return Ok(new
        {
            TotalLessons = totalLessons,
            CompletedLessons = completedCount,
            CompletionPercent = totalLessons == 0 ? 0 : Math.Round(completedCount * 100.0 / totalLessons, 1),
            Streak = await CalculateStreak(userId),
            LevelProgress = levelProgress,
            RecentLessons = recent,
            RecentQuizAttempts = attempts
        });
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteLesson(CompleteLessonRequest request)
    {
        var userId = User.GetUserId();
        if (!await db.Lessons.AnyAsync(x => x.Id == request.LessonId))
        {
            return NotFound(new { error = "Lesson not found." });
        }

        var progress = await db.UserProgress.FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == request.LessonId);
        if (progress is null)
        {
            db.UserProgress.Add(new UserProgress
            {
                UserId = userId,
                LessonId = request.LessonId,
                Completed = true,
                CompletedAt = DateTime.UtcNow,
                TimeSpent = Math.Max(0, request.TimeSpent)
            });
        }
        else
        {
            progress.Completed = true;
            progress.CompletedAt ??= DateTime.UtcNow;
            progress.TimeSpent += Math.Max(0, request.TimeSpent);
        }

        await db.SaveChangesAsync();
        await achievements.EvaluateProgressAsync(userId);
        return Ok(new { completed = true });
    }

    [HttpGet("lesson/{lessonId:guid}")]
    public async Task<IActionResult> LessonProgress(Guid lessonId)
    {
        var userId = User.GetUserId();
        var progress = await db.UserProgress.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        return Ok(progress ?? new UserProgress { UserId = userId, LessonId = lessonId, Completed = false });
    }

    private async Task<int> CalculateStreak(Guid userId)
    {
        var days = await db.UserProgress
            .Where(x => x.UserId == userId && x.CompletedAt != null)
            .Select(x => x.CompletedAt!.Value.Date)
            .Distinct()
            .ToListAsync();

        var set = days.ToHashSet();
        var streak = 0;
        var cursor = DateTime.UtcNow.Date;
        while (set.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
