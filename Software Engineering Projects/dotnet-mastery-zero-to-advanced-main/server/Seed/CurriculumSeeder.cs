using DotNetMastery.Api.Data;
using DotNetMastery.Api.Models;
using DotNetMastery.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace DotNetMastery.Api.Seed;

public static class CurriculumSeeder
{
    public static async Task SeedAsync(AppDbContext db, PasswordHasher passwordHasher)
    {
        await SeedUsersAsync(db, passwordHasher);

        if (await db.Levels.AnyAsync())
        {
            await EnrichExistingContentAsync(db);
            return;
        }

        var levelSpecs = BuildLevelSpecs();
        var allLessons = new List<Lesson>();
        var allModules = new List<LearningModule>();

        foreach (var spec in levelSpecs)
        {
            var level = new Level
            {
                Title = spec.Title,
                Description = $"A complete learning block for {spec.Title}. Learners start with plain-language explanations, then apply each idea through code, quizzes, and practice.",
                Order = spec.Order,
                Difficulty = DifficultyFor(spec.Order),
                EstimatedHours = spec.Order < 2 ? 4 : spec.Order < 10 ? 6 : spec.Order < 18 ? 8 : 10
            };

            db.Levels.Add(level);
            var chunks = ChunkTopics(spec.Topics, spec.Topics.Length >= 10 ? 3 : 2);

            for (var moduleIndex = 0; moduleIndex < chunks.Count; moduleIndex++)
            {
                var chunk = chunks[moduleIndex];
                var moduleTitle = $"{spec.Title}: {ModuleName(moduleIndex)}";
                var module = new LearningModule
                {
                    Level = level,
                    Title = moduleTitle,
                    Description = $"Learn {string.Join(", ", chunk.Take(4))} with beginner-friendly explanations, C# examples, and guided practice.",
                    Order = moduleIndex + 1,
                    Difficulty = DifficultyFor(spec.Order)
                };

                db.Modules.Add(module);
                allModules.Add(module);

                var lessonTopics = chunk.Take(3).ToList();
                while (lessonTopics.Count < 3)
                {
                    lessonTopics.Add($"{spec.Title} practice {lessonTopics.Count + 1}");
                }

                for (var lessonIndex = 0; lessonIndex < lessonTopics.Count; lessonIndex++)
                {
                    var topic = lessonTopics[lessonIndex];
                    var slug = Slugify($"{spec.Order}-{moduleIndex + 1}-{lessonIndex + 1}-{topic}");
                    var content = BuildLessonContent(topic, spec.Title, spec.Order);
                    var lesson = new Lesson
                    {
                        Module = module,
                        Title = topic,
                        Slug = slug,
                        Difficulty = DifficultyFor(spec.Order),
                        EstimatedMinutes = 18 + (spec.Order % 5) * 4,
                        SimpleExplanation = content.SimpleExplanation,
                        Eli10Explanation = content.Eli10Explanation,
                        Analogy = content.Analogy,
                        WhyItMatters = content.WhyItMatters,
                        CodeExample = content.CodeExample,
                        LineByLineExplanation = content.LineByLineExplanation,
                        CommonMistakes = content.CommonMistakes,
                        MiniPracticeTask = content.MiniPracticeTask,
                        Summary = content.Summary,
                        Tags = TagsFor(topic, spec.Title)
                    };

                    db.Lessons.Add(lesson);
                    allLessons.Add(lesson);
                    AddQuizQuestions(db, lesson, spec.Order);
                }
            }
        }

        for (var i = 0; i < allLessons.Count - 1; i++)
        {
            allLessons[i].NextLesson = allLessons[i + 1];
        }

        AddPracticeExercises(db, allModules);
        AddGuidedProjects(db, allModules);
        AddFinalExams(db);
        AddAchievements(db);

        await db.SaveChangesAsync();
    }

    private static async Task EnrichExistingContentAsync(AppDbContext db)
    {
        var lessons = await db.Lessons.Include(x => x.Module).ThenInclude(x => x!.Level).ToListAsync();
        foreach (var lesson in lessons)
        {
            if (!lesson.SimpleExplanation.Contains("Study path:", StringComparison.OrdinalIgnoreCase)
                || lesson.CodeExample.Contains("Learning ", StringComparison.OrdinalIgnoreCase))
            {
                var levelOrder = lesson.Module?.Level?.Order ?? 0;
                var levelTitle = lesson.Module?.Level?.Title ?? "the .NET learning path";
                var content = BuildLessonContent(lesson.Title, levelTitle, levelOrder);
                lesson.SimpleExplanation = content.SimpleExplanation;
                lesson.Eli10Explanation = content.Eli10Explanation;
                lesson.Analogy = content.Analogy;
                lesson.WhyItMatters = content.WhyItMatters;
                lesson.CodeExample = content.CodeExample;
                lesson.LineByLineExplanation = content.LineByLineExplanation;
                lesson.CommonMistakes = content.CommonMistakes;
                lesson.MiniPracticeTask = content.MiniPracticeTask;
                lesson.Summary = content.Summary;
            }
        }

        var exercises = await db.PracticeExercises.Include(x => x.Module).ToListAsync();
        foreach (var exercise in exercises)
        {
            if (exercise.ExpectedOutput.StartsWith("A readable", StringComparison.OrdinalIgnoreCase)
                || exercise.Solution.Contains("Practice lab complete", StringComparison.OrdinalIgnoreCase))
            {
                ApplyExerciseContent(exercise, exercise.Module?.Title ?? "C# practice lab", exercise.Module?.Difficulty ?? exercise.Difficulty);
            }
        }

        var projects = await db.GuidedProjects.ToListAsync();
        foreach (var project in projects)
        {
            if (project.Requirements.Count <= 4 || !project.Steps.Any(x => x.StartsWith("Checkpoint:", StringComparison.OrdinalIgnoreCase)))
            {
                ApplyProjectDepth(project);
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedUsersAsync(AppDbContext db, PasswordHasher passwordHasher)
    {
        if (!await db.Users.AnyAsync(x => x.Email == "admin@dotnetmastery.local"))
        {
            db.Users.Add(new User
            {
                Name = "Ali Rayyan Admin",
                Email = "admin@dotnetmastery.local",
                Role = Roles.Admin,
                PasswordHash = passwordHasher.Hash("Admin123!")
            });
        }

        if (!await db.Users.AnyAsync(x => x.Email == "student@dotnetmastery.local"))
        {
            db.Users.Add(new User
            {
                Name = "Demo Student",
                Email = "student@dotnetmastery.local",
                Role = Roles.Student,
                PasswordHash = passwordHasher.Hash("Student123!")
            });
        }

        await db.SaveChangesAsync();
    }

    private static List<LevelSpec> BuildLevelSpecs() =>
    [
        new(0, "LEVEL 0: Absolute Programming Basics", ["What is programming?", "What is code?", "What is a programming language?", "What is a compiler?", "What is an error?", "What is debugging?", "What is syntax?", "What is an IDE?", "What is source code?", "What is a project?"]),
        new(1, "LEVEL 1: Introduction to .NET and C#", ["What is .NET?", "What is C#?", "Why companies use .NET", ".NET SDK", ".NET runtime", "CLR", "IL code", "JIT compiler", "Visual Studio", "VS Code", "Rider", "dotnet CLI", "First C# program", "Console.WriteLine explained"]),
        new(2, "LEVEL 2: C# Basics", ["Variables", "Data types", "int, double, decimal, bool, char, string", "var keyword", "Constants", "Type conversion", "Casting", "Operators", "Input/output", "Comments", "Naming rules"]),
        new(3, "LEVEL 3: Control Flow", ["if", "else", "else if", "switch", "ternary operator", "for loop", "while loop", "do while loop", "break", "continue", "nested loops", "pattern printing", "dry runs"]),
        new(4, "LEVEL 4: Methods and Basic Program Structure", ["What is a method?", "Parameters", "Return values", "void", "Method overloading", "Scope", "Static methods", "Recursion basics", "Clean function writing"]),
        new(5, "LEVEL 5: Arrays, Strings, and Collections", ["Arrays", "Multi-dimensional arrays", "Strings", "String methods", "StringBuilder", "List", "Dictionary", "HashSet", "Queue", "Stack", "LINQ basics", "foreach", "Common collection mistakes"]),
        new(6, "LEVEL 6: Object-Oriented Programming in C#", ["Class", "Object", "Fields", "Properties", "Methods", "Constructors", "this keyword", "Encapsulation", "Inheritance", "Polymorphism", "Abstraction", "Interfaces", "Abstract classes", "Access modifiers", "Composition"]),
        new(7, "LEVEL 7: Advanced C# Language Features", ["Nullable types", "Nullable reference types", "Records", "Tuples", "Enums", "Generics", "Delegates", "Events", "Lambda expressions", "Extension methods", "Pattern matching", "Async/await", "Exception handling"]),
        new(8, "LEVEL 8: LINQ Deep Dive", ["What is LINQ?", "Where", "Select", "OrderBy", "GroupBy", "Join", "Any", "All", "FirstOrDefault", "SingleOrDefault", "Aggregate", "Deferred execution", "LINQ with collections", "LINQ with EF Core"]),
        new(9, "LEVEL 9: File Handling and Serialization", ["Reading files", "Writing files", "JSON serialization", "XML basics", "CSV basics", "System.Text.Json", "Newtonsoft.Json concept", "Streams", "Using statement", "IDisposable"]),
        new(10, "LEVEL 10: Databases and SQL for .NET", ["What is a database?", "Tables", "Rows", "Columns", "Primary keys", "Foreign keys", "SQL basics", "SELECT", "INSERT", "UPDATE", "DELETE", "JOIN", "Relationships", "Database design basics"]),
        new(11, "LEVEL 11: Entity Framework Core", ["What is an ORM?", "DbContext", "DbSet", "Entities", "Migrations", "Relationships", "One-to-many", "Many-to-many", "LINQ with EF Core", "Tracking vs no tracking", "Seeding data", "Repository pattern concept", "Common EF Core mistakes"]),
        new(12, "LEVEL 12: ASP.NET Core Fundamentals", ["What is ASP.NET Core?", "Web server concept", "HTTP request/response", "Middleware", "Routing", "Controllers", "Minimal APIs", "Dependency injection", "Configuration", "appsettings.json", "Logging", "Environments", "Swagger"]),
        new(13, "LEVEL 13: Building Web APIs", ["REST API basics", "Controllers", "DTOs", "Model validation", "Status codes", "CRUD endpoints", "Error handling", "Pagination", "Filtering", "Sorting", "API versioning concept", "Postman/Thunder Client testing"]),
        new(14, "LEVEL 14: Authentication and Authorization", ["Authentication vs authorization", "Password hashing", "JWT", "Cookies", "Claims", "Roles", "Policies", "Refresh tokens concept", "Securing endpoints", "OWASP basics for APIs"]),
        new(15, "LEVEL 15: ASP.NET Core MVC", ["MVC pattern", "Controllers", "Views", "Models", "Razor syntax", "Layouts", "ViewData/ViewBag", "Forms", "Validation", "Tag Helpers", "MVC CRUD app"]),
        new(16, "LEVEL 16: Razor Pages", ["What are Razor Pages?", "PageModel", "Handlers", "Forms", "Validation", "CRUD app with Razor Pages", "When to use Razor Pages vs MVC"]),
        new(17, "LEVEL 17: Blazor", ["What is Blazor?", "Blazor Server", "Blazor WebAssembly", "Components", "Parameters", "Event handling", "Forms", "Data binding", "Routing", "Calling APIs", "Building a dashboard"]),
        new(18, "LEVEL 18: Desktop Development with .NET", ["WinForms overview", "WPF overview", "MAUI overview", "XAML concept", "Desktop app structure", "When desktop apps are useful", "Enterprise desktop software examples"]),
        new(19, "LEVEL 19: Testing in .NET", ["Why testing matters", "Unit testing", "xUnit", "NUnit concept", "MSTest concept", "Assertions", "Mocking", "Moq concept", "Integration testing", "Test naming", "TDD basics"]),
        new(20, "LEVEL 20: Clean Architecture and Design Patterns", ["Layered architecture", "Clean architecture", "Domain layer", "Application layer", "Infrastructure layer", "Presentation layer", "SOLID principles", "Dependency injection", "Repository pattern", "Unit of Work concept", "Factory", "Strategy", "Builder", "Mediator/CQRS concept"]),
        new(21, "LEVEL 21: Enterprise .NET Development", ["Logging with Serilog concept", "Background services", "Hosted services", "Hangfire concept", "Caching", "Redis concept", "Message queues", "RabbitMQ concept", "Microservices overview", "Docker for .NET", "Configuration management", "Health checks"]),
        new(22, "LEVEL 22: Cloud and Deployment", ["Publishing .NET apps", "IIS", "Nginx reverse proxy concept", "Docker deployment", "Azure App Service concept", "Azure SQL concept", "Environment variables", "CI/CD basics", "GitHub Actions for .NET", "Production checklist"]),
        new(23, "LEVEL 23: Security in .NET", ["Secure coding", "Input validation", "Output encoding", "SQL injection prevention", "XSS prevention", "CSRF protection", "Secure cookies", "HTTPS", "Secrets management", "Rate limiting", "Security headers", "Logging security events", "OWASP Top 10 for .NET developers"]),
        new(24, "LEVEL 24: Performance and Debugging", ["Debugger", "Breakpoints", "Watch window", "Logging", "Profiling concept", "Memory management", "Garbage collection", "Async performance", "EF Core performance", "Caching", "Avoiding N+1 queries"]),
        new(25, "LEVEL 25: Real-World .NET Projects", ["Console calculator", "Student grade system", "Bank account system", "File-based notes app", "Inventory system", "ASP.NET Core CRUD API", "Authentication API", "Blog API", "Task manager API", "MVC expense tracker", "Blazor dashboard", "EF Core bookstore app", "Clean architecture API", "Dockerized .NET API"])
    ];

    private static void AddQuizQuestions(AppDbContext db, Lesson lesson, int levelOrder)
    {
        var topic = lesson.Title;
        var difficulty = DifficultyFor(levelOrder);
        var questions = new[]
        {
            new QuizQuestion
            {
                Lesson = lesson,
                Type = "mcq",
                Difficulty = difficulty,
                Question = $"What is the main purpose of {topic}?",
                Options = [$"To help solve a specific programming problem involving {topic}", "To decorate code without changing behavior", "To replace every other .NET feature", "To make code impossible to test"],
                CorrectAnswer = $"To help solve a specific programming problem involving {topic}",
                Explanation = $"{topic} is useful because it gives developers a precise way to model, control, or organize part of an application."
            },
            new QuizQuestion
            {
                Lesson = lesson,
                Type = "true-false",
                Difficulty = difficulty,
                Question = $"True or false: You should learn {topic} by combining explanation, code reading, and small practice tasks.",
                Options = ["True", "False"],
                CorrectAnswer = "True",
                Explanation = "Professional learning sticks when you connect concepts to working code and repeat the idea in a small exercise."
            },
            new QuizQuestion
            {
                Lesson = lesson,
                Type = "code-output",
                Difficulty = difficulty,
                Question = $"What does this print?\nConsole.WriteLine(\"{SafeText(topic)} ready\");",
                Options = [$"{SafeText(topic)} ready", "ready", "Compilation failed", "Nothing"],
                CorrectAnswer = $"{SafeText(topic)} ready",
                Explanation = "Console.WriteLine writes the exact string between the quotation marks and then moves to a new line."
            },
            new QuizQuestion
            {
                Lesson = lesson,
                Type = "scenario",
                Difficulty = difficulty,
                Question = $"A teammate understands the syntax for {topic} but not when to use it. What is the best next step?",
                Options = ["Show a tiny real-world scenario and walk through the code", "Tell them to memorize the keyword only", "Skip practice until production", "Remove tests"],
                CorrectAnswer = "Show a tiny real-world scenario and walk through the code",
                Explanation = "Scenario-based learning connects the feature to developer judgment, which is the difference between remembering and using."
            }
        };

        db.QuizQuestions.AddRange(questions);
    }

    private static void AddPracticeExercises(AppDbContext db, List<LearningModule> modules)
    {
        foreach (var module in modules)
        {
            var exercise = new PracticeExercise
            {
                Module = module,
                Title = $"{module.Title} practice lab",
                Difficulty = module.Difficulty,
                Tags = ["practice", "csharp", "dotnet", Slugify(module.Title)]
            };
            ApplyExerciseContent(exercise, module.Title, module.Difficulty);
            db.PracticeExercises.Add(exercise);
        }
    }

    private static void AddGuidedProjects(AppDbContext db, List<LearningModule> modules)
    {
        var projectTitles = new[]
        {
            "Console calculator", "Student grade system", "Bank account system", "File-based notes app", "Inventory system",
            "ASP.NET Core CRUD API", "Authentication API", "Blog API", "Task manager API", "MVC expense tracker",
            "Blazor dashboard", "EF Core bookstore app", "Clean architecture API", "Dockerized .NET API", "Enterprise readiness checklist"
        };

        for (var i = 0; i < projectTitles.Length; i++)
        {
            var module = modules[Math.Min(i * 2, modules.Count - 1)];
            var title = projectTitles[i];
            var project = new GuidedProject
            {
                Module = module,
                Title = title,
                Difficulty = module.Difficulty,
                Description = $"Build a complete {title} while practicing the skills from {module.Title}.",
                ExpectedResult = $"A working {title} that can be demonstrated locally.",
                StarterCode = "Console.WriteLine(\"Start the project here\");",
                FinalCode = "Console.WriteLine(\"Project completed\");",
                Explanation = "Each guided project turns isolated lessons into a small product-style build with requirements, tradeoffs, and finishing steps."
            };
            ApplyProjectDepth(project);
            db.GuidedProjects.Add(project);
        }
    }

    private static void AddFinalExams(AppDbContext db)
    {
        var finalExamLevels = db.ChangeTracker
            .Entries<Level>()
            .Select(x => x.Entity)
            .Where(x => x.Order > 0 && x.Order % 5 == 0)
            .ToList();

        foreach (var level in finalExamLevels)
        {
            for (var i = 1; i <= 5; i++)
            {
                db.QuizQuestions.Add(new QuizQuestion
                {
                    Level = level,
                    Type = "final-exam",
                    Difficulty = level.Difficulty,
                    Question = $"Final exam checkpoint {i} for {level.Title}: what matters most in professional .NET learning?",
                    Options = ["Understanding concepts, writing code, and reviewing feedback", "Only copying snippets", "Avoiding debugging", "Ignoring security"],
                    CorrectAnswer = "Understanding concepts, writing code, and reviewing feedback",
                    Explanation = "Final exams check durable understanding across several levels, not memorized words alone."
                });
            }
        }
    }

    private static void AddAchievements(AppDbContext db)
    {
        var achievements = new[]
        {
            ("First Login", "Joined the .NET Mastery platform.", "spark", "login_once"),
            ("First Lesson", "Completed your first lesson.", "book", "complete_1_lesson"),
            ("Five Lessons", "Completed five lessons.", "stack", "complete_5_lessons"),
            ("Ten Lessons", "Completed ten lessons.", "layers", "complete_10_lessons"),
            ("Level Starter", "Completed a lesson in a new level.", "flag", "complete_level_lesson"),
            ("Quiz Taker", "Submitted a quiz attempt.", "check", "submit_quiz"),
            ("Quiz Pass", "Passed a quiz with at least 70%.", "target", "pass_quiz"),
            ("Perfect Quiz", "Scored 100% on a quiz.", "star", "perfect_quiz"),
            ("Practice Ready", "Opened a practice exercise.", "terminal", "view_exercise"),
            ("Project Explorer", "Opened a guided project.", "map", "view_project"),
            ("Bookmarker", "Bookmarked a lesson.", "bookmark", "create_bookmark"),
            ("Note Keeper", "Saved a lesson note.", "note", "save_note"),
            ("Three Day Streak", "Learned on three different days.", "flame", "streak_3"),
            ("Seven Day Streak", "Learned on seven different days.", "flame", "streak_7"),
            ("C# Basics", "Reached the C# basics path.", "code", "reach_level_2"),
            ("API Builder", "Reached the Web API path.", "api", "reach_level_13"),
            ("Security Mindset", "Reached the security path.", "shield", "reach_level_23"),
            ("Project Builder", "Completed a guided project checklist.", "build", "complete_project"),
            ("Final Exam", "Submitted a final exam.", "award", "submit_final_exam"),
            ("Certificate Earned", "Generated a completion certificate.", "certificate", "generate_certificate")
        };

        foreach (var item in achievements)
        {
            db.Achievements.Add(new Achievement
            {
                Title = item.Item1,
                Description = item.Item2,
                Icon = item.Item3,
                Condition = item.Item4
            });
        }
    }

    private static List<string[]> ChunkTopics(string[] topics, int chunks)
    {
        var result = new List<string[]>();
        var size = (int)Math.Ceiling(topics.Length / (double)chunks);
        for (var i = 0; i < topics.Length; i += size)
        {
            result.Add(topics.Skip(i).Take(size).ToArray());
        }
        return result;
    }

    private static string ModuleName(int index) => index switch
    {
        0 => "Foundations",
        1 => "Applied Practice",
        _ => "Professional Patterns"
    };

    private static string DifficultyFor(int order) => order switch
    {
        <= 2 => "Absolute Beginner",
        <= 6 => "Beginner",
        <= 12 => "Intermediate",
        <= 19 => "Advanced",
        _ => "Professional"
    };

    private static LessonContent BuildLessonContent(string topic, string levelTitle, int order)
    {
        if (AuthoredLessonContent.TryGetValue(topic, out var authored))
        {
            return authored;
        }

        var code = CodeFor(topic, order);
        return new LessonContent(
            SimpleExplanation:
                $"Study path: define it, see it in C#, predict the output, then change the code yourself.\n\n{topic} is a practical idea inside {levelTitle}. Start by asking three questions: what problem does it solve, what does the code look like, and what mistake would a beginner probably make? When you can answer those three questions, the topic becomes usable instead of just familiar.",
            Eli10Explanation:
                $"Think of a program as a set of careful instructions. {topic} is one part of those instructions. You do not need to memorize a fancy definition first. You need to see what job it does, try it in a tiny program, and notice what changes when you edit one line.",
            Analogy:
                $"{topic} is like a labeled control on a machine. The label tells you what the control is for, but you only really understand it after you press it once, watch what happens, and learn when not to press it.",
            WhyItMatters:
                $"You will meet {topic} in tutorials, interviews, production code, bug fixes, and code reviews. Knowing the term is useful, but the professional skill is recognizing when it makes code clearer, safer, faster, or easier to test.",
            CodeExample: code,
            LineByLineExplanation:
                $"1. Read the example once without typing. Name the input values and the output.\n2. Type the code yourself so your hands learn the shape of {topic}.\n3. Run it and predict the output before looking.\n4. Change one value or name and run it again.\n5. Explain the change in one sentence. That sentence is the real learning.",
            CommonMistakes:
            [
                $"Memorizing the definition of {topic} but never running a small example.",
                "Copying code before predicting what it will print or return.",
                "Ignoring compiler messages instead of reading the first error carefully.",
                "Using vague names such as data, item, or thing when a precise name would explain the program."
            ],
            MiniPracticeTask:
                $"Write a 5-10 line console program that demonstrates {topic}. Before running it, write down the output you expect. Then change one line and explain why the output changed.",
            Summary:
                $"{topic} is now connected to a definition, a tiny C# example, a practice loop, and a mistake checklist. Move on only after you can explain it without reading this page."
        );
    }

    private static readonly Dictionary<string, LessonContent> AuthoredLessonContent = new(StringComparer.OrdinalIgnoreCase)
    {
        ["What is programming?"] = new(
            "Study path: understand the idea before the tools.\n\nProgramming means writing instructions that a computer can follow exactly. A computer does not guess your intention, so programming teaches you to break a goal into tiny clear steps. In .NET, those steps are usually written in C#, compiled by the .NET SDK, and run by the .NET runtime. At beginner level, the most important idea is not syntax. It is learning to think in steps: input, decision, action, output.",
            "Imagine you want a friend to make tea, but your friend only does exactly what you say. If you say 'make tea' and nothing else, they may stop. If you say 'boil water, put tea in cup, pour water, wait, add sugar,' they can follow. Programming is writing those clear steps for a computer.",
            "Programming is like a recipe. The ingredients are data, the recipe steps are code, and the finished dish is the program output.",
            "Every .NET topic later in the course depends on this. APIs, databases, Blazor, testing, and cloud deployment are all bigger versions of the same skill: describe a problem clearly enough that software can solve it.",
            "Console.WriteLine(\"Hello, future .NET developer!\");",
            "1. Console is a built-in C# type for terminal input and output.\n2. WriteLine is a method that prints text and moves to the next line.\n3. The text inside quotes is a string.\n4. The semicolon ends the instruction.\n5. Running the program shows the message in the console.",
            ["Thinking programmers are born instead of trained.", "Trying to learn everything before writing the first line.", "Skipping small console programs because they look too simple."],
            "Write a program that prints your name, your goal, and one reason you want to learn .NET. Use three Console.WriteLine statements.",
            "Programming is clear step-by-step problem solving. C# is one language for writing those steps, and .NET gives you the tools to run them."
        ),
        ["What is .NET?"] = new(
            "Study path: separate language, platform, and tools.\n\n.NET is a developer platform from Microsoft for building many kinds of applications: web APIs, websites, desktop apps, background services, mobile apps, cloud systems, and more. C# is the language you usually write. The .NET SDK builds the code. The .NET runtime runs the compiled app. ASP.NET Core, EF Core, Blazor, and MAUI are frameworks or libraries that sit on top of .NET for specific jobs.",
            "Think of .NET as a big toolbox. C# is the language on the instruction cards. The SDK is the set of tools for building. The runtime is the machine that runs what you built.",
            ".NET is like a workshop. C# is how you describe the object you want, the SDK is the equipment, and the runtime is the place where the finished object works.",
            "Companies use .NET because it is fast, stable, strongly typed, mature, cross-platform, cloud-friendly, and excellent for large business systems that must be maintained for years.",
            "Console.WriteLine(Environment.Version);\nConsole.WriteLine(\".NET is running this program.\");",
            "1. Environment.Version asks the runtime which .NET version is executing the program.\n2. Console.WriteLine prints that version.\n3. The second line prints a human-readable confirmation.\n4. You are seeing the runtime, not just the source code.",
            ["Mixing up C# and .NET.", "Installing only an editor and forgetting the SDK.", "Assuming .NET only runs on Windows."],
            "Run dotnet --version in a terminal. Then write a console program that prints the version using Environment.Version.",
            ".NET is the platform. C# is the language. The SDK builds your app. The runtime runs it."
        ),
        ["Variables"] = new(
            "Study path: values need names.\n\nA variable is a named place for a value your program needs to remember. In C#, variables have types, such as int for whole numbers and string for text. Good variable names make code easier to read. When you write int age = 20, you are saying: create a variable named age, store a whole number in it, and begin with the value 20.",
            "A variable is like a labeled box. If the label says age, you should put an age inside it. Later you can open the box and use the value.",
            "Variables are sticky notes on information. The note says what the value means, not just what the value is.",
            "Every useful program remembers something: a username, a price, a score, a date, a status. Variables are the first step toward modeling real work in code.",
            "string learnerName = \"Ali\";\nint completedLessons = 3;\nConsole.WriteLine($\"{learnerName} completed {completedLessons} lessons.\");",
            "1. string learnerName stores text.\n2. int completedLessons stores a whole number.\n3. The interpolated string starts with $ so variables can be placed inside braces.\n4. Console.WriteLine prints the final sentence.",
            ["Using names like x when the value has a real meaning.", "Putting text in an int variable.", "Forgetting that variable names are case-sensitive."],
            "Create variables for your name, your current level, and your target study minutes. Print one sentence using all three.",
            "Variables give names to values. Good names make your program easier to understand and debug."
        ),
        ["if"] = new(
            "Study path: programs need decisions.\n\nAn if statement lets code choose whether to run a block. The condition must be true or false. In C#, the condition goes inside parentheses and the chosen instructions go inside braces. This is how a program starts behaving differently for different data.",
            "If it is raining, take an umbrella. If it is not raining, do not. A C# if statement works like that.",
            "An if statement is a gate. If the condition unlocks the gate, the code inside runs.",
            "Authentication, validation, discounts, permissions, retries, and error handling all depend on decisions. Without if statements, software could only do the same thing every time.",
            "int score = 82;\nif (score >= 70)\n{\n    Console.WriteLine(\"Passed\");\n}",
            "1. score stores the number being checked.\n2. score >= 70 is the condition.\n3. If the condition is true, the block inside braces runs.\n4. The output is Passed because 82 is greater than or equal to 70.",
            ["Using = instead of == when comparing equality.", "Forgetting braces when the block grows.", "Writing conditions that are hard to read because names are vague."],
            "Write a program with an int temperature. Print Hot if it is at least 30.",
            "if lets your program make a decision based on a true/false condition."
        ),
        ["What is ASP.NET Core?"] = new(
            "Study path: connect C# to the web.\n\nASP.NET Core is the .NET framework for building web apps, APIs, real-time apps, and backend services. A browser or client sends an HTTP request. ASP.NET Core routes that request to code you wrote. Your code returns a response, usually JSON for APIs or HTML for web pages. Middleware, routing, controllers, dependency injection, configuration, and logging are the main building blocks.",
            "Imagine a restaurant. A customer makes an order, the waiter takes it to the kitchen, the kitchen prepares it, and the waiter brings back the result. ASP.NET Core is the system that receives web requests and returns responses.",
            "ASP.NET Core is like a traffic controller for web requests. It reads the route, sends the request to the right code, and sends the response back.",
            "Most enterprise .NET jobs involve web backends. ASP.NET Core is where C# becomes APIs, dashboards, authentication systems, business workflows, and cloud services.",
            "var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\n\napp.MapGet(\"/hello\", () => \"Hello from ASP.NET Core\");\n\napp.Run();",
            "1. CreateBuilder prepares configuration, services, and hosting.\n2. Build creates the web app.\n3. MapGet registers an HTTP GET endpoint.\n4. The lambda returns text as the response.\n5. Run starts the web server.",
            ["Trying to learn controllers before understanding request and response.", "Putting business logic directly everywhere instead of organizing it.", "Forgetting that API responses need useful status codes."],
            "Create a minimal API endpoint /today that returns a sentence with today's learning goal.",
            "ASP.NET Core turns .NET code into web applications and APIs by handling HTTP requests and responses."
        )
    };

    private static void ApplyExerciseContent(PracticeExercise exercise, string moduleTitle, string difficulty)
    {
        var firstTopic = moduleTitle.Contains(':') ? moduleTitle.Split(':').Last().Trim() : moduleTitle;
        var label = SafeText(firstTopic);
        exercise.Title = $"{moduleTitle} output challenge";
        exercise.Difficulty = difficulty;
        exercise.ProblemStatement =
            $"Write a C# console program that prints exactly three lines for this module. This exercise is intentionally small so the automatic grader can check your first compile-run-feedback loop.\n\nLine 1: Module: {label}\nLine 2: Skill: C# practice\nLine 3: Status: complete";
        exercise.Hints =
        [
            "Use one Console.WriteLine statement per output line.",
            "Output matching is exact after trimming empty lines, so spelling and line order matter.",
            "Run the code before checking the solution."
        ];
        exercise.ExpectedOutput = $"Module: {label}\nSkill: C# practice\nStatus: complete";
        exercise.Solution = $"Console.WriteLine(\"Module: {label}\");\nConsole.WriteLine(\"Skill: C# practice\");\nConsole.WriteLine(\"Status: complete\");";
        exercise.Explanation = "This builds the habit of writing a tiny program, running it, reading the output, and adjusting code until it matches a requirement.";
        exercise.Tags = exercise.Tags.Distinct().Append("graded").Append("console").ToList();
    }

    private static void ApplyProjectDepth(GuidedProject project)
    {
        project.Requirements =
        [
            "Define the user goal in one sentence.",
            "Create a small data model with meaningful names.",
            "Implement the happy path first.",
            "Add validation for at least two invalid inputs.",
            "Show clear success and error messages.",
            "Test the workflow manually with normal, empty, and incorrect values.",
            "Write a short README-style demo script."
        ];
        project.Steps =
        [
            "Checkpoint: Plan - write the goal, inputs, outputs, and data model.",
            "Checkpoint: Skeleton - create the project and run the first successful build.",
            "Checkpoint: Core workflow - implement the main feature with simple data.",
            "Checkpoint: Validation - reject bad input with useful messages.",
            "Checkpoint: Persistence or state - keep the result long enough to demonstrate it.",
            "Checkpoint: Review - rename unclear variables and remove duplicated code.",
            "Checkpoint: Demo - run through the project like you are showing it to an interviewer."
        ];
        project.ExtensionIdeas =
        [
            "Add xUnit tests around the most important rule.",
            "Store data in a file or database.",
            "Add authentication or roles when the project has multiple user types.",
            "Add logging for important events.",
            "Containerize the project after it works locally."
        ];
        project.Explanation =
            "This project is split into checkpoints so you can save progress and avoid the beginner trap of trying to build everything at once.";
    }

    private static string CodeFor(string topic, int order)
    {
        var variable = Slugify(topic).Replace("-", "");
        if (string.IsNullOrWhiteSpace(variable) || char.IsDigit(variable[0]))
        {
            variable = "concept";
        }

        return order switch
        {
            <= 1 => $"Console.WriteLine(\"Learning {SafeText(topic)}\");",
            <= 4 => $"var {variable} = \"{SafeText(topic)}\";\nConsole.WriteLine($\"Topic: {{{variable}}}\");",
            <= 7 => $"public class Demo\n{{\n    public string Topic {{ get; set; }} = \"{SafeText(topic)}\";\n}}\n\nvar demo = new Demo();\nConsole.WriteLine(demo.Topic);",
            <= 12 => $"var items = new[] {{ \"{SafeText(topic)}\", \"practice\", \".NET\" }};\nvar matches = items.Where(x => x.Contains(\".\")).ToList();\nConsole.WriteLine(matches.Count);",
            <= 17 => $"app.MapGet(\"/api/demo\", () => Results.Ok(new {{ topic = \"{SafeText(topic)}\" }}));",
            _ => $"logger.LogInformation(\"Applying {SafeText(topic)} in a production-style .NET system\");"
        };
    }

    private static string LineByLineFor(string topic) =>
        $"Line 1 sets up the smallest possible example for {topic}.\nLine 2 executes the idea and makes the result visible.\nWhen you study the code, focus on the input, the operation, and the output.";

    private static List<string> CommonMistakesFor(string topic) =>
    [
        $"Trying to memorize {topic} without running code.",
        "Skipping compiler errors instead of reading them carefully.",
        "Using unclear names that hide the intent of the program."
    ];

    private static List<string> TagsFor(string topic, string levelTitle)
    {
        var tags = Slugify($"{topic} {levelTitle}").Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Where(x => x.Length > 2)
            .Distinct()
            .Take(6)
            .ToList();
        tags.Add("dotnet");
        tags.Add("csharp");
        return tags.Distinct().ToList();
    }

    private static string SafeText(string value) => value.Replace("\"", string.Empty).Replace("\\", string.Empty);

    private static string Slugify(string value)
    {
        var chars = value.ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray();
        var slug = string.Join('-', new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrWhiteSpace(slug) ? "item" : slug;
    }

    private record LevelSpec(int Order, string Title, string[] Topics);

    private record LessonContent(
        string SimpleExplanation,
        string Eli10Explanation,
        string Analogy,
        string WhyItMatters,
        string CodeExample,
        string LineByLineExplanation,
        List<string> CommonMistakes,
        string MiniPracticeTask,
        string Summary);
}
