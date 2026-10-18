namespace DotNetMastery.Api.DTOs;

public record LevelUpsertRequest(string Title, string Description, int Order, string Difficulty, int EstimatedHours);

public record ModuleUpsertRequest(Guid LevelId, string Title, string Description, int Order, string Difficulty);

public record LessonUpsertRequest(
    Guid ModuleId,
    string Title,
    string Slug,
    string Difficulty,
    int EstimatedMinutes,
    string SimpleExplanation,
    string Eli10Explanation,
    string Analogy,
    string WhyItMatters,
    string CodeExample,
    string LineByLineExplanation,
    List<string> CommonMistakes,
    string MiniPracticeTask,
    string Summary,
    Guid? NextLessonId,
    List<string> Tags);

public record QuizQuestionUpsertRequest(
    Guid? LessonId,
    Guid? ModuleId,
    Guid? LevelId,
    string Question,
    List<string> Options,
    string CorrectAnswer,
    string Explanation,
    string Difficulty,
    string Type);

public record PracticeExerciseUpsertRequest(
    Guid ModuleId,
    Guid? LessonId,
    string Title,
    string Difficulty,
    string ProblemStatement,
    List<string> Hints,
    string ExpectedOutput,
    string Solution,
    string Explanation,
    List<string> Tags);

public record GuidedProjectUpsertRequest(
    Guid ModuleId,
    string Title,
    string Difficulty,
    string Description,
    List<string> Requirements,
    List<string> Steps,
    string ExpectedResult,
    string StarterCode,
    string FinalCode,
    string Explanation,
    List<string> ExtensionIdeas);

public record QuizAnswerRequest(Guid QuestionId, string Answer);

public record SubmitQuizRequest(
    string QuizId,
    Guid? LessonId,
    Guid? ModuleId,
    Guid? LevelId,
    List<QuizAnswerRequest> Answers);

public record NoteRequest(string Content);
public record CompleteLessonRequest(Guid LessonId, int TimeSpent);

public record RunCodeRequest(string Code, string? Stdin = null);
public record GradeExerciseRequest(string Code);

public record RunCodeResult(
    bool Success,
    string Stdout,
    string Stderr,
    int ExitCode,
    bool TimedOut,
    int ElapsedMs,
    List<string> Diagnostics);

public record GradeExerciseResult(
    bool Passed,
    string ExpectedOutput,
    string ActualOutput,
    string Feedback,
    RunCodeResult Run);
