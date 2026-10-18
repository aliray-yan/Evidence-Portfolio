using System.ComponentModel.DataAnnotations;

namespace DotNetMastery.Api.Models;

public static class Roles
{
    public const string Student = "Student";
    public const string Admin = "Admin";
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(220)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Role { get; set; } = Roles.Student;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Level
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(180)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(1200)]
    public string Description { get; set; } = string.Empty;

    public int Order { get; set; }

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    public int EstimatedHours { get; set; }

    public ICollection<LearningModule> Modules { get; set; } = new List<LearningModule>();
}

public class LearningModule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LevelId { get; set; }

    [Required, MaxLength(180)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(1200)]
    public string Description { get; set; } = string.Empty;

    public int Order { get; set; }

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    public Level? Level { get; set; }
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}

public class Lesson
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ModuleId { get; set; }

    [Required, MaxLength(220)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(260)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    public int EstimatedMinutes { get; set; }

    [Required]
    public string SimpleExplanation { get; set; } = string.Empty;

    [Required]
    public string Eli10Explanation { get; set; } = string.Empty;

    [Required]
    public string Analogy { get; set; } = string.Empty;

    [Required]
    public string WhyItMatters { get; set; } = string.Empty;

    [Required]
    public string CodeExample { get; set; } = string.Empty;

    [Required]
    public string LineByLineExplanation { get; set; } = string.Empty;

    public List<string> CommonMistakes { get; set; } = new();

    [Required]
    public string MiniPracticeTask { get; set; } = string.Empty;

    [Required]
    public string Summary { get; set; } = string.Empty;

    public Guid? NextLessonId { get; set; }
    public List<string> Tags { get; set; } = new();

    public LearningModule? Module { get; set; }
    public Lesson? NextLesson { get; set; }
    public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
}

public class QuizQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? LessonId { get; set; }
    public Guid? ModuleId { get; set; }
    public Guid? LevelId { get; set; }

    [Required]
    public string Question { get; set; } = string.Empty;

    public List<string> Options { get; set; } = new();

    [Required]
    public string CorrectAnswer { get; set; } = string.Empty;

    [Required]
    public string Explanation { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    [Required, MaxLength(60)]
    public string Type { get; set; } = "mcq";

    public Lesson? Lesson { get; set; }
    public LearningModule? Module { get; set; }
    public Level? Level { get; set; }
}

public class PracticeExercise
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ModuleId { get; set; }
    public Guid? LessonId { get; set; }

    [Required, MaxLength(220)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    [Required]
    public string ProblemStatement { get; set; } = string.Empty;

    public List<string> Hints { get; set; } = new();

    [Required]
    public string ExpectedOutput { get; set; } = string.Empty;

    [Required]
    public string Solution { get; set; } = string.Empty;

    [Required]
    public string Explanation { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = new();

    public LearningModule? Module { get; set; }
    public Lesson? Lesson { get; set; }
}

public class GuidedProject
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ModuleId { get; set; }

    [Required, MaxLength(220)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Difficulty { get; set; } = "Beginner";

    [Required]
    public string Description { get; set; } = string.Empty;

    public List<string> Requirements { get; set; } = new();
    public List<string> Steps { get; set; } = new();

    [Required]
    public string ExpectedResult { get; set; } = string.Empty;

    [Required]
    public string StarterCode { get; set; } = string.Empty;

    [Required]
    public string FinalCode { get; set; } = string.Empty;

    [Required]
    public string Explanation { get; set; } = string.Empty;

    public List<string> ExtensionIdeas { get; set; } = new();

    public LearningModule? Module { get; set; }
}

public class Bookmark
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Lesson? Lesson { get; set; }
}

public class Note
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Lesson? Lesson { get; set; }
}

public class UserProgress
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TimeSpent { get; set; }

    public User? User { get; set; }
    public Lesson? Lesson { get; set; }
}

public class QuizAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(120)]
    public string QuizId { get; set; } = string.Empty;

    public Guid? LessonId { get; set; }
    public Guid? ModuleId { get; set; }
    public Guid? LevelId { get; set; }
    public int Score { get; set; }
    public int Total { get; set; }
    public bool Passed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}

public class Achievement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(140)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string Icon { get; set; } = "badge";

    [Required, MaxLength(220)]
    public string Condition { get; set; } = string.Empty;
}

public class UserAchievement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid AchievementId { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Achievement? Achievement { get; set; }
}

public class Certificate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime CompletionDate { get; set; } = DateTime.UtcNow;
    public int FinalScore { get; set; }

    [Required, MaxLength(80)]
    public string CertificateCode { get; set; } = string.Empty;

    public User? User { get; set; }
}
