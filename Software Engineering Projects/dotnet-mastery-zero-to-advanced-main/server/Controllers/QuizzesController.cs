using DotNetMastery.Api.Data;
using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Models;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizzesController(AppDbContext db, AchievementService achievements) : ControllerBase
{
    [HttpGet("lesson/{lessonId:guid}")]
    public async Task<IActionResult> LessonQuiz(Guid lessonId)
    {
        var questions = await db.QuizQuestions
            .AsNoTracking()
            .Where(x => x.LessonId == lessonId)
            .Select(x => new { x.Id, x.Question, x.Options, x.Difficulty, x.Type, x.Explanation })
            .ToListAsync();
        return Ok(questions);
    }

    [HttpGet("module/{moduleId:guid}")]
    public async Task<IActionResult> ModuleQuiz(Guid moduleId)
    {
        var questions = await db.QuizQuestions
            .AsNoTracking()
            .Where(x => x.ModuleId == moduleId || x.Lesson!.ModuleId == moduleId)
            .Take(20)
            .Select(x => new { x.Id, x.Question, x.Options, x.Difficulty, x.Type, x.Explanation })
            .ToListAsync();
        return Ok(questions);
    }

    [HttpGet("final/{levelId:guid}")]
    public async Task<IActionResult> FinalExam(Guid levelId)
    {
        var questions = await db.QuizQuestions
            .AsNoTracking()
            .Where(x => x.LevelId == levelId && x.Type == "final-exam")
            .Select(x => new { x.Id, x.Question, x.Options, x.Difficulty, x.Type, x.Explanation })
            .ToListAsync();
        return Ok(questions);
    }

    [Authorize]
    [HttpPost("attempts")]
    public async Task<IActionResult> SubmitAttempt(SubmitQuizRequest request)
    {
        if (request.Answers.Count == 0)
        {
            return BadRequest(new { error = "At least one answer is required." });
        }

        var questionIds = request.Answers.Select(x => x.QuestionId).ToList();
        var questions = await db.QuizQuestions.Where(x => questionIds.Contains(x.Id)).ToListAsync();
        var score = request.Answers.Count(answer =>
            questions.Any(q => q.Id == answer.QuestionId && string.Equals(q.CorrectAnswer.Trim(), answer.Answer.Trim(), StringComparison.OrdinalIgnoreCase)));
        var total = questions.Count;
        var passed = total > 0 && score / (double)total >= 0.7;
        var userId = User.GetUserId();

        db.QuizAttempts.Add(new QuizAttempt
        {
            UserId = userId,
            QuizId = request.QuizId,
            LessonId = request.LessonId,
            ModuleId = request.ModuleId,
            LevelId = request.LevelId,
            Score = score,
            Total = total,
            Passed = passed
        });
        await db.SaveChangesAsync();

        await achievements.UnlockByConditionAsync(userId, "submit_quiz");
        if (passed) await achievements.UnlockByConditionAsync(userId, "pass_quiz");
        if (score == total) await achievements.UnlockByConditionAsync(userId, "perfect_quiz");
        if (request.LevelId is not null) await achievements.UnlockByConditionAsync(userId, "submit_final_exam");

        var feedback = questions.Select(q => new
        {
            q.Id,
            CorrectAnswer = q.CorrectAnswer,
            q.Explanation,
            UserAnswer = request.Answers.FirstOrDefault(a => a.QuestionId == q.Id)?.Answer,
            IsCorrect = string.Equals(q.CorrectAnswer.Trim(), request.Answers.FirstOrDefault(a => a.QuestionId == q.Id)?.Answer?.Trim(), StringComparison.OrdinalIgnoreCase)
        });

        return Ok(new { score, total, passed, feedback });
    }
}
