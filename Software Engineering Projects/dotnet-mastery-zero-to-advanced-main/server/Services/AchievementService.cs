using DotNetMastery.Api.Data;
using DotNetMastery.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Services;

public class AchievementService(AppDbContext db)
{
    public async Task UnlockByConditionAsync(Guid userId, string condition)
    {
        var achievement = await db.Achievements.FirstOrDefaultAsync(x => x.Condition == condition);
        if (achievement is null)
        {
            return;
        }

        var exists = await db.UserAchievements.AnyAsync(x => x.UserId == userId && x.AchievementId == achievement.Id);
        if (exists)
        {
            return;
        }

        db.UserAchievements.Add(new UserAchievement
        {
            UserId = userId,
            AchievementId = achievement.Id
        });
        await db.SaveChangesAsync();
    }

    public async Task EvaluateProgressAsync(Guid userId)
    {
        var completed = await db.UserProgress.CountAsync(x => x.UserId == userId && x.Completed);
        if (completed >= 1) await UnlockByConditionAsync(userId, "complete_1_lesson");
        if (completed >= 5) await UnlockByConditionAsync(userId, "complete_5_lessons");
        if (completed >= 10) await UnlockByConditionAsync(userId, "complete_10_lessons");

        var dates = await db.UserProgress
            .Where(x => x.UserId == userId && x.CompletedAt != null)
            .Select(x => x.CompletedAt!.Value.Date)
            .Distinct()
            .ToListAsync();

        if (dates.Count >= 3) await UnlockByConditionAsync(userId, "streak_3");
        if (dates.Count >= 7) await UnlockByConditionAsync(userId, "streak_7");
    }
}
