using DotNetMastery.Api.Data;
using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/[controller]")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        return Ok(new
        {
            Users = await db.Users.CountAsync(),
            Levels = await db.Levels.CountAsync(),
            Modules = await db.Modules.CountAsync(),
            Lessons = await db.Lessons.CountAsync(),
            QuizQuestions = await db.QuizQuestions.CountAsync(),
            PracticeExercises = await db.PracticeExercises.CountAsync(),
            GuidedProjects = await db.GuidedProjects.CountAsync(),
            QuizAttempts = await db.QuizAttempts.CountAsync(),
            Certificates = await db.Certificates.CountAsync()
        });
    }

    [HttpGet("levels")]
    public async Task<IActionResult> Levels() => Ok(await db.Levels.AsNoTracking().OrderBy(x => x.Order).ToListAsync());

    [HttpPost("levels")]
    public async Task<IActionResult> CreateLevel(LevelUpsertRequest request)
    {
        var entity = new Level();
        Apply(entity, request);
        db.Levels.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Levels), new { id = entity.Id }, entity);
    }

    [HttpPut("levels/{id:guid}")]
    public async Task<IActionResult> UpdateLevel(Guid id, LevelUpsertRequest request)
    {
        var entity = await db.Levels.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("levels/{id:guid}")]
    public async Task<IActionResult> DeleteLevel(Guid id)
    {
        var entity = await db.Levels.FindAsync(id);
        if (entity is null) return NoContent();
        db.Levels.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("modules")]
    public async Task<IActionResult> Modules() => Ok(await db.Modules.AsNoTracking().OrderBy(x => x.Order).ToListAsync());

    [HttpPost("modules")]
    public async Task<IActionResult> CreateModule(ModuleUpsertRequest request)
    {
        var entity = new LearningModule();
        Apply(entity, request);
        db.Modules.Add(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("modules/{id:guid}")]
    public async Task<IActionResult> UpdateModule(Guid id, ModuleUpsertRequest request)
    {
        var entity = await db.Modules.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("modules/{id:guid}")]
    public async Task<IActionResult> DeleteModule(Guid id)
    {
        var entity = await db.Modules.FindAsync(id);
        if (entity is null) return NoContent();
        db.Modules.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("lessons")]
    public async Task<IActionResult> Lessons([FromQuery] int take = 200) => Ok(await db.Lessons.AsNoTracking().Take(Math.Clamp(take, 1, 500)).ToListAsync());

    [HttpPost("lessons")]
    public async Task<IActionResult> CreateLesson(LessonUpsertRequest request)
    {
        var entity = new Lesson();
        Apply(entity, request);
        db.Lessons.Add(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("lessons/{id:guid}")]
    public async Task<IActionResult> UpdateLesson(Guid id, LessonUpsertRequest request)
    {
        var entity = await db.Lessons.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("lessons/{id:guid}")]
    public async Task<IActionResult> DeleteLesson(Guid id)
    {
        var entity = await db.Lessons.FindAsync(id);
        if (entity is null) return NoContent();
        db.Lessons.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("quiz-questions")]
    public async Task<IActionResult> QuizQuestions([FromQuery] int take = 250) => Ok(await db.QuizQuestions.AsNoTracking().Take(Math.Clamp(take, 1, 1000)).ToListAsync());

    [HttpPost("quiz-questions")]
    public async Task<IActionResult> CreateQuizQuestion(QuizQuestionUpsertRequest request)
    {
        var entity = new QuizQuestion();
        Apply(entity, request);
        db.QuizQuestions.Add(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("quiz-questions/{id:guid}")]
    public async Task<IActionResult> UpdateQuizQuestion(Guid id, QuizQuestionUpsertRequest request)
    {
        var entity = await db.QuizQuestions.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("quiz-questions/{id:guid}")]
    public async Task<IActionResult> DeleteQuizQuestion(Guid id)
    {
        var entity = await db.QuizQuestions.FindAsync(id);
        if (entity is null) return NoContent();
        db.QuizQuestions.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("practice-exercises")]
    public async Task<IActionResult> PracticeExercises([FromQuery] int take = 200) => Ok(await db.PracticeExercises.AsNoTracking().Take(Math.Clamp(take, 1, 500)).ToListAsync());

    [HttpPost("practice-exercises")]
    public async Task<IActionResult> CreatePracticeExercise(PracticeExerciseUpsertRequest request)
    {
        var entity = new PracticeExercise();
        Apply(entity, request);
        db.PracticeExercises.Add(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("practice-exercises/{id:guid}")]
    public async Task<IActionResult> UpdatePracticeExercise(Guid id, PracticeExerciseUpsertRequest request)
    {
        var entity = await db.PracticeExercises.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("practice-exercises/{id:guid}")]
    public async Task<IActionResult> DeletePracticeExercise(Guid id)
    {
        var entity = await db.PracticeExercises.FindAsync(id);
        if (entity is null) return NoContent();
        db.PracticeExercises.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("guided-projects")]
    public async Task<IActionResult> GuidedProjects([FromQuery] int take = 200) => Ok(await db.GuidedProjects.AsNoTracking().Take(Math.Clamp(take, 1, 500)).ToListAsync());

    [HttpPost("guided-projects")]
    public async Task<IActionResult> CreateGuidedProject(GuidedProjectUpsertRequest request)
    {
        var entity = new GuidedProject();
        Apply(entity, request);
        db.GuidedProjects.Add(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpPut("guided-projects/{id:guid}")]
    public async Task<IActionResult> UpdateGuidedProject(Guid id, GuidedProjectUpsertRequest request)
    {
        var entity = await db.GuidedProjects.FindAsync(id);
        if (entity is null) return NotFound();
        Apply(entity, request);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("guided-projects/{id:guid}")]
    public async Task<IActionResult> DeleteGuidedProject(Guid id)
    {
        var entity = await db.GuidedProjects.FindAsync(id);
        if (entity is null) return NoContent();
        db.GuidedProjects.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Level entity, LevelUpsertRequest request)
    {
        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.Order = request.Order;
        entity.Difficulty = request.Difficulty;
        entity.EstimatedHours = request.EstimatedHours;
    }

    private static void Apply(LearningModule entity, ModuleUpsertRequest request)
    {
        entity.LevelId = request.LevelId;
        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.Order = request.Order;
        entity.Difficulty = request.Difficulty;
    }

    private static void Apply(Lesson entity, LessonUpsertRequest request)
    {
        entity.ModuleId = request.ModuleId;
        entity.Title = request.Title;
        entity.Slug = request.Slug;
        entity.Difficulty = request.Difficulty;
        entity.EstimatedMinutes = request.EstimatedMinutes;
        entity.SimpleExplanation = request.SimpleExplanation;
        entity.Eli10Explanation = request.Eli10Explanation;
        entity.Analogy = request.Analogy;
        entity.WhyItMatters = request.WhyItMatters;
        entity.CodeExample = request.CodeExample;
        entity.LineByLineExplanation = request.LineByLineExplanation;
        entity.CommonMistakes = request.CommonMistakes;
        entity.MiniPracticeTask = request.MiniPracticeTask;
        entity.Summary = request.Summary;
        entity.NextLessonId = request.NextLessonId;
        entity.Tags = request.Tags;
    }

    private static void Apply(QuizQuestion entity, QuizQuestionUpsertRequest request)
    {
        entity.LessonId = request.LessonId;
        entity.ModuleId = request.ModuleId;
        entity.LevelId = request.LevelId;
        entity.Question = request.Question;
        entity.Options = request.Options;
        entity.CorrectAnswer = request.CorrectAnswer;
        entity.Explanation = request.Explanation;
        entity.Difficulty = request.Difficulty;
        entity.Type = request.Type;
    }

    private static void Apply(PracticeExercise entity, PracticeExerciseUpsertRequest request)
    {
        entity.ModuleId = request.ModuleId;
        entity.LessonId = request.LessonId;
        entity.Title = request.Title;
        entity.Difficulty = request.Difficulty;
        entity.ProblemStatement = request.ProblemStatement;
        entity.Hints = request.Hints;
        entity.ExpectedOutput = request.ExpectedOutput;
        entity.Solution = request.Solution;
        entity.Explanation = request.Explanation;
        entity.Tags = request.Tags;
    }

    private static void Apply(GuidedProject entity, GuidedProjectUpsertRequest request)
    {
        entity.ModuleId = request.ModuleId;
        entity.Title = request.Title;
        entity.Difficulty = request.Difficulty;
        entity.Description = request.Description;
        entity.Requirements = request.Requirements;
        entity.Steps = request.Steps;
        entity.ExpectedResult = request.ExpectedResult;
        entity.StarterCode = request.StarterCode;
        entity.FinalCode = request.FinalCode;
        entity.Explanation = request.Explanation;
        entity.ExtensionIdeas = request.ExtensionIdeas;
    }
}
