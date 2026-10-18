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
public class CertificateController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.GetUserId();
        var certificate = await db.Certificates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        return certificate is null ? NotFound(new { error = "Certificate has not been generated yet." }) : Ok(certificate);
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate()
    {
        var userId = User.GetUserId();
        var existing = await db.Certificates.FirstOrDefaultAsync(x => x.UserId == userId);
        if (existing is not null)
        {
            return Ok(existing);
        }

        var total = await db.Lessons.CountAsync();
        var completed = await db.UserProgress.CountAsync(x => x.UserId == userId && x.Completed);
        if (total == 0 || completed < total)
        {
            return BadRequest(new { error = "Complete every lesson before generating the certificate.", completed, total });
        }

        var attempts = await db.QuizAttempts.Where(x => x.UserId == userId).ToListAsync();
        var finalScore = attempts.Count == 0 ? 100 : (int)Math.Round(attempts.Average(x => x.Total == 0 ? 0 : x.Score * 100.0 / x.Total));
        var certificate = new Certificate
        {
            UserId = userId,
            FinalScore = finalScore,
            CertificateCode = $"DNM-{DateTime.UtcNow:yyyyMMdd}-{userId.ToString()[..8].ToUpperInvariant()}"
        };

        db.Certificates.Add(certificate);
        await db.SaveChangesAsync();
        await achievements.UnlockByConditionAsync(userId, "generate_certificate");
        return Ok(certificate);
    }
}
