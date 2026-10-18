using DotNetMastery.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<LearningModule> Modules => Set<LearningModule>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<PracticeExercise> PracticeExercises => Set<PracticeExercise>();
    public DbSet<GuidedProject> GuidedProjects => Set<GuidedProject>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<UserProgress> UserProgress => Set<UserProgress>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();
    public DbSet<Certificate> Certificates => Set<Certificate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Lesson>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<Bookmark>().HasIndex(x => new { x.UserId, x.LessonId }).IsUnique();
        modelBuilder.Entity<Note>().HasIndex(x => new { x.UserId, x.LessonId }).IsUnique();
        modelBuilder.Entity<UserProgress>().HasIndex(x => new { x.UserId, x.LessonId }).IsUnique();
        modelBuilder.Entity<UserAchievement>().HasIndex(x => new { x.UserId, x.AchievementId }).IsUnique();
        modelBuilder.Entity<Certificate>().HasIndex(x => x.CertificateCode).IsUnique();

        modelBuilder.Entity<LearningModule>()
            .ToTable("Modules")
            .HasOne(x => x.Level)
            .WithMany(x => x.Modules)
            .HasForeignKey(x => x.LevelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Lesson>()
            .HasOne(x => x.Module)
            .WithMany(x => x.Lessons)
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Lesson>()
            .HasOne(x => x.NextLesson)
            .WithMany()
            .HasForeignKey(x => x.NextLessonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<QuizQuestion>()
            .HasOne(x => x.Lesson)
            .WithMany(x => x.QuizQuestions)
            .HasForeignKey(x => x.LessonId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizQuestion>()
            .HasOne(x => x.Module)
            .WithMany()
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizQuestion>()
            .HasOne(x => x.Level)
            .WithMany()
            .HasForeignKey(x => x.LevelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PracticeExercise>()
            .HasOne(x => x.Module)
            .WithMany()
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PracticeExercise>()
            .HasOne(x => x.Lesson)
            .WithMany()
            .HasForeignKey(x => x.LessonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<GuidedProject>()
            .HasOne(x => x.Module)
            .WithMany()
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
