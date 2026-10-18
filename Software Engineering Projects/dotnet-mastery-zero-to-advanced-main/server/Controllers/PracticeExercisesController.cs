using DotNetMastery.Api.Data;
using DotNetMastery.Api.DTOs;
using DotNetMastery.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Controllers;

[ApiController]
[Route("api/practice-exercises")]
public class PracticeExercisesController(AppDbContext db, AchievementService achievements, CSharpRunnerService runner) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid? moduleId)
    {
        var query = db.PracticeExercises.AsNoTracking();
        if (moduleId is not null)
        {
            query = query.Where(x => x.ModuleId == moduleId);
        }

        var exercises = await query
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.ModuleId,
                ModuleTitle = x.Module!.Title,
                x.LessonId,
                x.Title,
                x.Difficulty,
                x.ProblemStatement,
                x.Hints,
                x.ExpectedOutput,
                x.Solution,
                x.Explanation,
                x.Tags
            })
            .ToListAsync();

        return Ok(exercises);
    }

    [Authorize]
    [HttpPost("{id:guid}/grade")]
    public async Task<ActionResult<GradeExerciseResult>> Grade(Guid id, GradeExerciseRequest request, CancellationToken cancellationToken)
    {
        var exercise = await db.PracticeExercises.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (exercise is null)
        {
            return NotFound();
        }

        var run = await runner.RunAsync(request.Code, cancellationToken: cancellationToken);
        var expected = CSharpRunnerService.NormalizeOutput(exercise.ExpectedOutput);
        var actual = CSharpRunnerService.NormalizeOutput(run.Stdout);
        var passed = run.Success && string.Equals(expected, actual, StringComparison.Ordinal);
        var feedback = passed
            ? "Passed. Your program output matches the expected output."
            : run.Success
                ? "Your code ran, but the output does not match yet. Compare whitespace, spelling, and line order."
                : "Your code did not run successfully. Read the compiler/runtime output and try again.";

        return Ok(new GradeExerciseResult(passed, expected, actual, feedback, run));
    }

    [Authorize]
    [HttpPost("{id:guid}/opened")]
    public async Task<IActionResult> MarkOpened(Guid id)
    {
        if (!await db.PracticeExercises.AnyAsync(x => x.Id == id))
        {
            return NotFound();
        }

        await achievements.UnlockByConditionAsync(User.GetUserId(), "view_exercise");
        return NoContent();
    }
}
