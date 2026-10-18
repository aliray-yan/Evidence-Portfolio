const levelSpecs = [
  [0, "LEVEL 0: Absolute Programming Basics", ["What is programming?", "What is code?", "What is a programming language?", "What is a compiler?", "What is an error?", "What is debugging?", "What is syntax?", "What is an IDE?", "What is source code?", "What is a project?"]],
  [1, "LEVEL 1: Introduction to .NET and C#", ["What is .NET?", "What is C#?", "Why companies use .NET", ".NET SDK", ".NET runtime", "CLR", "IL code", "JIT compiler", "Visual Studio", "VS Code", "Rider", "dotnet CLI", "First C# program", "Console.WriteLine explained"]],
  [2, "LEVEL 2: C# Basics", ["Variables", "Data types", "int, double, decimal, bool, char, string", "var keyword", "Constants", "Type conversion", "Casting", "Operators", "Input/output", "Comments", "Naming rules"]],
  [3, "LEVEL 3: Control Flow", ["if", "else", "else if", "switch", "ternary operator", "for loop", "while loop", "do while loop", "break", "continue", "nested loops", "pattern printing", "dry runs"]],
  [4, "LEVEL 4: Methods and Basic Program Structure", ["What is a method?", "Parameters", "Return values", "void", "Method overloading", "Scope", "Static methods", "Recursion basics", "Clean function writing"]],
  [5, "LEVEL 5: Arrays, Strings, and Collections", ["Arrays", "Multi-dimensional arrays", "Strings", "String methods", "StringBuilder", "List", "Dictionary", "HashSet", "Queue", "Stack", "LINQ basics", "foreach", "Common collection mistakes"]],
  [6, "LEVEL 6: Object-Oriented Programming in C#", ["Class", "Object", "Fields", "Properties", "Methods", "Constructors", "this keyword", "Encapsulation", "Inheritance", "Polymorphism", "Abstraction", "Interfaces", "Abstract classes", "Access modifiers", "Composition"]],
  [7, "LEVEL 7: Advanced C# Language Features", ["Nullable types", "Nullable reference types", "Records", "Tuples", "Enums", "Generics", "Delegates", "Events", "Lambda expressions", "Extension methods", "Pattern matching", "Async/await", "Exception handling"]],
  [8, "LEVEL 8: LINQ Deep Dive", ["What is LINQ?", "Where", "Select", "OrderBy", "GroupBy", "Join", "Any", "All", "FirstOrDefault", "SingleOrDefault", "Aggregate", "Deferred execution", "LINQ with collections", "LINQ with EF Core"]],
  [9, "LEVEL 9: File Handling and Serialization", ["Reading files", "Writing files", "JSON serialization", "XML basics", "CSV basics", "System.Text.Json", "Newtonsoft.Json concept", "Streams", "Using statement", "IDisposable"]],
  [10, "LEVEL 10: Databases and SQL for .NET", ["What is a database?", "Tables", "Rows", "Columns", "Primary keys", "Foreign keys", "SQL basics", "SELECT", "INSERT", "UPDATE", "DELETE", "JOIN", "Relationships", "Database design basics"]],
  [11, "LEVEL 11: Entity Framework Core", ["What is an ORM?", "DbContext", "DbSet", "Entities", "Migrations", "Relationships", "One-to-many", "Many-to-many", "LINQ with EF Core", "Tracking vs no tracking", "Seeding data", "Repository pattern concept", "Common EF Core mistakes"]],
  [12, "LEVEL 12: ASP.NET Core Fundamentals", ["What is ASP.NET Core?", "Web server concept", "HTTP request/response", "Middleware", "Routing", "Controllers", "Minimal APIs", "Dependency injection", "Configuration", "appsettings.json", "Logging", "Environments", "Swagger"]],
  [13, "LEVEL 13: Building Web APIs", ["REST API basics", "Controllers", "DTOs", "Model validation", "Status codes", "CRUD endpoints", "Error handling", "Pagination", "Filtering", "Sorting", "API versioning concept", "Postman/Thunder Client testing"]],
  [14, "LEVEL 14: Authentication and Authorization", ["Authentication vs authorization", "Password hashing", "JWT", "Cookies", "Claims", "Roles", "Policies", "Refresh tokens concept", "Securing endpoints", "OWASP basics for APIs"]],
  [15, "LEVEL 15: ASP.NET Core MVC", ["MVC pattern", "Controllers", "Views", "Models", "Razor syntax", "Layouts", "ViewData/ViewBag", "Forms", "Validation", "Tag Helpers", "MVC CRUD app"]],
  [16, "LEVEL 16: Razor Pages", ["What are Razor Pages?", "PageModel", "Handlers", "Forms", "Validation", "CRUD app with Razor Pages", "When to use Razor Pages vs MVC"]],
  [17, "LEVEL 17: Blazor", ["What is Blazor?", "Blazor Server", "Blazor WebAssembly", "Components", "Parameters", "Event handling", "Forms", "Data binding", "Routing", "Calling APIs", "Building a dashboard"]],
  [18, "LEVEL 18: Desktop Development with .NET", ["WinForms overview", "WPF overview", "MAUI overview", "XAML concept", "Desktop app structure", "When desktop apps are useful", "Enterprise desktop software examples"]],
  [19, "LEVEL 19: Testing in .NET", ["Why testing matters", "Unit testing", "xUnit", "NUnit concept", "MSTest concept", "Assertions", "Mocking", "Moq concept", "Integration testing", "Test naming", "TDD basics"]],
  [20, "LEVEL 20: Clean Architecture and Design Patterns", ["Layered architecture", "Clean architecture", "Domain layer", "Application layer", "Infrastructure layer", "Presentation layer", "SOLID principles", "Dependency injection", "Repository pattern", "Unit of Work concept", "Factory", "Strategy", "Builder", "Mediator/CQRS concept"]],
  [21, "LEVEL 21: Enterprise .NET Development", ["Logging with Serilog concept", "Background services", "Hosted services", "Hangfire concept", "Caching", "Redis concept", "Message queues", "RabbitMQ concept", "Microservices overview", "Docker for .NET", "Configuration management", "Health checks"]],
  [22, "LEVEL 22: Cloud and Deployment", ["Publishing .NET apps", "IIS", "Nginx reverse proxy concept", "Docker deployment", "Azure App Service concept", "Azure SQL concept", "Environment variables", "CI/CD basics", "GitHub Actions for .NET", "Production checklist"]],
  [23, "LEVEL 23: Security in .NET", ["Secure coding", "Input validation", "Output encoding", "SQL injection prevention", "XSS prevention", "CSRF protection", "Secure cookies", "HTTPS", "Secrets management", "Rate limiting", "Security headers", "Logging security events", "OWASP Top 10 for .NET developers"]],
  [24, "LEVEL 24: Performance and Debugging", ["Debugger", "Breakpoints", "Watch window", "Logging", "Profiling concept", "Memory management", "Garbage collection", "Async performance", "EF Core performance", "Caching", "Avoiding N+1 queries"]],
  [25, "LEVEL 25: Real-World .NET Projects", ["Console calculator", "Student grade system", "Bank account system", "File-based notes app", "Inventory system", "ASP.NET Core CRUD API", "Authentication API", "Blog API", "Task manager API", "MVC expense tracker", "Blazor dashboard", "EF Core bookstore app", "Clean architecture API", "Dockerized .NET API"]]
];

export function createStandaloneSeed() {
  const levels = [];
  const modules = [];
  const lessons = [];
  const quizQuestions = [];
  const practiceExercises = [];
  const guidedProjects = [];
  const achievements = createAchievements();

  for (const [order, title, topics] of levelSpecs) {
    const level = {
      id: `level-${order}`,
      title,
      description: `A complete learning block for ${title}. Learn the language, tools, workflows, and professional habits behind modern .NET development.`,
      order,
      difficulty: difficultyFor(order),
      estimatedHours: order < 2 ? 4 : order < 10 ? 6 : order < 18 ? 8 : 10
    };
    levels.push(level);

    const chunks = chunkTopics(topics, topics.length >= 10 ? 3 : 2);
    chunks.forEach((chunk, moduleIndex) => {
      const module = {
        id: `module-${order}-${moduleIndex + 1}`,
        levelId: level.id,
        title: `${title}: ${moduleName(moduleIndex)}`,
        description: `Learn ${chunk.slice(0, 4).join(", ")} with explanations, examples, quizzes, and hands-on practice.`,
        order: moduleIndex + 1,
        difficulty: level.difficulty
      };
      modules.push(module);

      const lessonTopics = [...chunk.slice(0, 3)];
      while (lessonTopics.length < 3) lessonTopics.push(`${title} practice ${lessonTopics.length + 1}`);
      lessonTopics.forEach((topic, lessonIndex) => {
        const content = buildLessonContent(topic, title, order);
        const lesson = {
          id: `lesson-${order}-${moduleIndex + 1}-${lessonIndex + 1}`,
          moduleId: module.id,
          title: topic,
          slug: slugify(`${order}-${moduleIndex + 1}-${lessonIndex + 1}-${topic}`),
          difficulty: level.difficulty,
          estimatedMinutes: 18 + (order % 5) * 4,
          simpleExplanation: content.simpleExplanation,
          eli10Explanation: content.eli10Explanation,
          analogy: content.analogy,
          whyItMatters: content.whyItMatters,
          codeExample: content.codeExample,
          lineByLineExplanation: content.lineByLineExplanation,
          commonMistakes: content.commonMistakes,
          miniPracticeTask: content.miniPracticeTask,
          summary: content.summary,
          nextLessonId: null,
          tags: tagsFor(topic, title)
        };
        lessons.push(lesson);
        quizQuestions.push(...questionsFor(lesson, order));
      });

      practiceExercises.push(createExercise(module));
    });
  }

  lessons.forEach((lesson, index) => {
    lesson.nextLessonId = lessons[index + 1]?.id || null;
  });

  const projectTitles = ["Console calculator", "Student grade system", "Bank account system", "File-based notes app", "Inventory system", "ASP.NET Core CRUD API", "Authentication API", "Blog API", "Task manager API", "MVC expense tracker", "Blazor dashboard", "EF Core bookstore app", "Clean architecture API", "Dockerized .NET API", "Enterprise readiness checklist"];
  projectTitles.forEach((title, index) => {
    const module = modules[Math.min(index * 2, modules.length - 1)];
    guidedProjects.push(createProject(title, index + 1, module));
  });

  levels.filter((level) => level.order > 0 && level.order % 5 === 0).forEach((level) => {
    for (let i = 1; i <= 5; i += 1) {
      quizQuestions.push({
        id: `final-${level.id}-${i}`,
        lessonId: null,
        moduleId: null,
        levelId: level.id,
        type: "final-exam",
        difficulty: level.difficulty,
        question: `Final exam checkpoint ${i} for ${level.title}: what matters most in professional .NET learning?`,
        options: ["Understanding concepts, writing code, and reviewing feedback", "Only copying snippets", "Avoiding debugging", "Ignoring security"],
        correctAnswer: "Understanding concepts, writing code, and reviewing feedback",
        explanation: "Final exams check durable understanding across several levels, not memorized words alone."
      });
    }
  });

  return {
    users: [
      { id: "user-admin", name: "Ali Rayyan Admin", email: "admin@dotnetmastery.local", password: "Admin123!", role: "Admin", createdAt: new Date().toISOString() },
      { id: "user-student", name: "Demo Student", email: "student@dotnetmastery.local", password: "Student123!", role: "Student", createdAt: new Date().toISOString() }
    ],
    levels,
    modules,
    lessons,
    quizQuestions,
    practiceExercises,
    guidedProjects,
    achievements,
    progress: [],
    bookmarks: [],
    notes: [],
    quizAttempts: [],
    userAchievements: [],
    certificates: [],
    projectProgress: []
  };
}

function createExercise(module) {
  const label = safeText(module.title.includes(":") ? module.title.split(":").pop().trim() : module.title);
  return {
    id: `exercise-${module.id}`,
    moduleId: module.id,
    lessonId: null,
    title: `${module.title} output challenge`,
    difficulty: module.difficulty,
    problemStatement: `Write a C# console program that prints exactly three lines for this module.\n\nLine 1: Module: ${label}\nLine 2: Skill: C# practice\nLine 3: Status: complete`,
    hints: ["Use one Console.WriteLine statement per output line.", "Output matching is exact after trimming empty lines.", "Run or mentally trace before checking the solution."],
    expectedOutput: `Module: ${label}\nSkill: C# practice\nStatus: complete`,
    solution: `Console.WriteLine("Module: ${label}");\nConsole.WriteLine("Skill: C# practice");\nConsole.WriteLine("Status: complete");`,
    explanation: "This builds the habit of writing a tiny program, reading output, and adjusting code until it matches a requirement.",
    tags: ["practice", "csharp", "dotnet", slugify(module.title), "graded", "console"]
  };
}

function createProject(title, index, module) {
  return {
    id: `project-${index}`,
    moduleId: module.id,
    title,
    difficulty: module.difficulty,
    description: `Build a complete ${title} while practicing the skills from ${module.title}.`,
    requirements: ["Define the user goal in one sentence.", "Create a small data model with meaningful names.", "Implement the happy path first.", "Add validation for at least two invalid inputs.", "Show clear success and error messages.", "Test the workflow manually with normal, empty, and incorrect values.", "Write a short README-style demo script."],
    steps: ["Checkpoint: Plan - write the goal, inputs, outputs, and data model.", "Checkpoint: Skeleton - create the project and run the first successful build.", "Checkpoint: Core workflow - implement the main feature with simple data.", "Checkpoint: Validation - reject bad input with useful messages.", "Checkpoint: Persistence or state - keep the result long enough to demonstrate it.", "Checkpoint: Review - rename unclear variables and remove duplicated code.", "Checkpoint: Demo - run through the project like you are showing it to an interviewer."],
    expectedResult: `A working ${title} that can be demonstrated locally.`,
    starterCode: "Console.WriteLine(\"Start the project here\");",
    finalCode: "Console.WriteLine(\"Project completed\");",
    explanation: "This project is split into checkpoints so you can save progress and avoid trying to build everything at once.",
    extensionIdeas: ["Add xUnit tests around the most important rule.", "Store data in a file or database.", "Add authentication or roles when the project has multiple user types.", "Add logging for important events.", "Containerize the project after it works locally."]
  };
}

function buildLessonContent(topic, levelTitle, order) {
  const authored = authoredLessons[topic.toLowerCase()];
  if (authored) return authored;
  return {
    simpleExplanation: `Study path: define it, see it in C#, predict the output, then change the code yourself.\n\n${topic} is a practical idea inside ${levelTitle}. Ask what problem it solves, what the code looks like, and what mistake a beginner would probably make.`,
    eli10Explanation: `Think of a program as careful instructions. ${topic} is one part of those instructions. You learn it by seeing the job it does, trying it in a tiny program, and changing one line.`,
    analogy: `${topic} is like a labeled control on a machine. The label helps, but you understand it after you use it and watch what changes.`,
    whyItMatters: `You will meet ${topic} in tutorials, interviews, production code, bug fixes, and code reviews. The professional skill is knowing when it makes code clearer, safer, faster, or easier to test.`,
    codeExample: codeFor(topic, order),
    lineByLineExplanation: `1. Read the example once without typing. Name the input values and output.\n2. Type the code yourself so your hands learn the shape of ${topic}.\n3. Run it and predict the output before looking.\n4. Change one value or name and run it again.\n5. Explain the change in one sentence.`,
    commonMistakes: [`Memorizing the definition of ${topic} but never running a small example.`, "Copying code before predicting what it will print or return.", "Ignoring compiler messages instead of reading the first error carefully.", "Using vague names when a precise name would explain the program."],
    miniPracticeTask: `Write a 5-10 line console program that demonstrates ${topic}. Before running it, write down the output you expect. Then change one line and explain why the output changed.`,
    summary: `${topic} is now connected to a definition, a tiny C# example, a practice loop, and a mistake checklist. Move on only after you can explain it without reading this page.`
  };
}

const authoredLessons = {
  "what is programming?": {
    simpleExplanation: "Study path: understand the idea before the tools.\n\nProgramming means writing instructions that a computer can follow exactly. A computer does not guess your intention, so programming teaches you to break a goal into tiny clear steps. In .NET, those steps are usually written in C#, compiled by the .NET SDK, and run by the .NET runtime.",
    eli10Explanation: "Imagine you want a friend to make tea, but your friend only does exactly what you say. If you say 'make tea' and nothing else, they may stop. If you say each small step, they can follow.",
    analogy: "Programming is like a recipe. The ingredients are data, the recipe steps are code, and the finished dish is the program output.",
    whyItMatters: "Every .NET topic later in the course depends on this. APIs, databases, Blazor, testing, and deployment are bigger versions of the same skill: describe a problem clearly enough that software can solve it.",
    codeExample: "Console.WriteLine(\"Hello, future .NET developer!\");",
    lineByLineExplanation: "1. Console is a built-in C# type for terminal input and output.\n2. WriteLine prints text and moves to the next line.\n3. The text inside quotes is a string.\n4. The semicolon ends the instruction.\n5. Running the program shows the message.",
    commonMistakes: ["Thinking programmers are born instead of trained.", "Trying to learn everything before writing the first line.", "Skipping small console programs because they look too simple."],
    miniPracticeTask: "Write a program that prints your name, your goal, and one reason you want to learn .NET. Use three Console.WriteLine statements.",
    summary: "Programming is clear step-by-step problem solving. C# is one language for writing those steps, and .NET gives you the tools to run them."
  },
  "what is .net?": {
    simpleExplanation: "Study path: separate language, platform, and tools.\n\n.NET is a developer platform from Microsoft for building web APIs, websites, desktop apps, background services, mobile apps, cloud systems, and more. C# is the language you usually write. The .NET SDK builds the code. The .NET runtime runs the compiled app.",
    eli10Explanation: "Think of .NET as a big toolbox. C# is the language on the instruction cards. The SDK is the tool set for building. The runtime is the machine that runs what you built.",
    analogy: ".NET is like a workshop. C# describes the object you want, the SDK is the equipment, and the runtime is where the finished object works.",
    whyItMatters: "Companies use .NET because it is fast, stable, strongly typed, mature, cross-platform, cloud-friendly, and excellent for large business systems.",
    codeExample: "Console.WriteLine(Environment.Version);\nConsole.WriteLine(\".NET is running this program.\");",
    lineByLineExplanation: "1. Environment.Version asks which .NET version is executing.\n2. Console.WriteLine prints that version.\n3. The second line prints a confirmation.\n4. You are seeing the runtime, not just source code.",
    commonMistakes: ["Mixing up C# and .NET.", "Installing only an editor and forgetting the SDK.", "Assuming .NET only runs on Windows."],
    miniPracticeTask: "Run dotnet --version in a terminal. Then write a console program that prints Environment.Version.",
    summary: ".NET is the platform. C# is the language. The SDK builds your app. The runtime runs it."
  },
  "variables": {
    simpleExplanation: "Study path: values need names.\n\nA variable is a named place for a value your program needs to remember. In C#, variables have types, such as int for whole numbers and string for text. Good variable names make code easier to read.",
    eli10Explanation: "A variable is like a labeled box. If the label says age, you should put an age inside it. Later you can open the box and use the value.",
    analogy: "Variables are sticky notes on information. The note says what the value means, not just what the value is.",
    whyItMatters: "Every useful program remembers something: a username, a price, a score, a date, a status. Variables are the first step toward modeling real work in code.",
    codeExample: "string learnerName = \"Ali\";\nint completedLessons = 3;\nConsole.WriteLine($\"{learnerName} completed {completedLessons} lessons.\");",
    lineByLineExplanation: "1. string learnerName stores text.\n2. int completedLessons stores a whole number.\n3. The interpolated string starts with $ so variables can be placed inside braces.\n4. Console.WriteLine prints the final sentence.",
    commonMistakes: ["Using names like x when the value has a real meaning.", "Putting text in an int variable.", "Forgetting that variable names are case-sensitive."],
    miniPracticeTask: "Create variables for your name, your current level, and your target study minutes. Print one sentence using all three.",
    summary: "Variables give names to values. Good names make your program easier to understand and debug."
  },
  "if": {
    simpleExplanation: "Study path: make the program choose.\n\nAn if statement runs code only when a condition is true. Conditions usually compare values, such as score >= 50 or name == \"Ali\". This is the beginning of programs that respond to real situations.",
    eli10Explanation: "If it is raining, take an umbrella. If it is not raining, you do not. C# uses the same idea, but the condition must be written clearly.",
    analogy: "An if statement is like a gate. The condition decides whether the code is allowed through.",
    whyItMatters: "Business software is full of decisions: approve an order, reject a password, show an admin page, apply a discount, or return a validation error.",
    codeExample: "int score = 82;\nif (score >= 70)\n{\n    Console.WriteLine(\"Passed\");\n}",
    lineByLineExplanation: "1. score stores a number.\n2. score >= 70 is the condition.\n3. The braces contain code that runs only when the condition is true.\n4. Because 82 is greater than 70, the program prints Passed.",
    commonMistakes: ["Using = instead of == for comparison.", "Forgetting braces when multiple lines should be controlled.", "Writing conditions that are hard to read."],
    miniPracticeTask: "Create an int temperature. If it is greater than 30, print Hot day. Change the value and predict what happens.",
    summary: "if gives your program decision-making. A condition controls whether a block of code runs."
  },
  "what is asp.net core?": {
    simpleExplanation: "Study path: move from console programs to web programs.\n\nASP.NET Core is the .NET framework for building web apps and APIs. It receives HTTP requests, runs your C# code, talks to services or databases, and returns HTTP responses.",
    eli10Explanation: "A browser or app asks your server for something. ASP.NET Core is the part that receives the question, finds the answer, and sends it back.",
    analogy: "ASP.NET Core is like the front desk of a software company. Requests arrive, get routed to the right worker, and responses go back to the customer.",
    whyItMatters: "Most professional .NET jobs involve APIs, internal dashboards, admin tools, authentication, and database-backed web systems. ASP.NET Core is the main path into that work.",
    codeExample: "var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet(\"/health\", () => \"OK\");\napp.Run();",
    lineByLineExplanation: "1. CreateBuilder prepares configuration and services.\n2. Build creates the web application.\n3. MapGet creates an HTTP GET endpoint.\n4. Run starts the server so it can receive requests.",
    commonMistakes: ["Trying to learn controllers before understanding HTTP.", "Putting every responsibility inside one endpoint.", "Forgetting that APIs need validation and useful status codes."],
    miniPracticeTask: "Create a minimal API with one /hello endpoint that returns your name. Then add a /health endpoint that returns OK.",
    summary: "ASP.NET Core lets your C# code answer web requests. It is the foundation for .NET APIs and many web apps."
  }
};

function questionsFor(lesson, order) {
  const topic = lesson.title;
  const safeTopic = safeText(topic);
  return [
    {
      id: `quiz-${lesson.id}-1`,
      lessonId: lesson.id,
      moduleId: null,
      levelId: null,
      type: "mcq",
      difficulty: difficultyFor(order),
      question: `What is the main purpose of ${topic}?`,
      options: [`To help solve a specific programming problem involving ${topic}`, "To decorate code without changing behavior", "To replace every other .NET feature", "To make code impossible to test"],
      correctAnswer: `To help solve a specific programming problem involving ${topic}`,
      explanation: `${topic} gives developers a precise way to model, control, or organize part of an application.`
    },
    {
      id: `quiz-${lesson.id}-2`,
      lessonId: lesson.id,
      moduleId: null,
      levelId: null,
      type: "true-false",
      difficulty: difficultyFor(order),
      question: `True or false: You should learn ${topic} by combining explanation, code reading, and small practice tasks.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Professional learning sticks when concepts are connected to working code."
    },
    {
      id: `quiz-${lesson.id}-3`,
      lessonId: lesson.id,
      moduleId: null,
      levelId: null,
      type: "code-output",
      difficulty: difficultyFor(order),
      question: `What does this print?\nConsole.WriteLine("${safeTopic} ready");`,
      options: [`${safeTopic} ready`, "ready", "Compilation failed", "Nothing"],
      correctAnswer: `${safeTopic} ready`,
      explanation: "Console.WriteLine writes the exact string between quotation marks."
    },
    {
      id: `quiz-${lesson.id}-4`,
      lessonId: lesson.id,
      moduleId: null,
      levelId: null,
      type: "scenario",
      difficulty: difficultyFor(order),
      question: `A teammate understands the syntax for ${topic} but not when to use it. What is the best next step?`,
      options: ["Show a tiny real-world scenario and walk through the code", "Tell them to memorize the keyword only", "Skip practice until production", "Remove tests"],
      correctAnswer: "Show a tiny real-world scenario and walk through the code",
      explanation: "Scenario-based learning connects syntax to developer judgment."
    }
  ];
}

function createAchievements() {
  const items = [
    ["First Login", "Joined the .NET Mastery platform.", "spark", "login_once"],
    ["First Lesson", "Completed your first lesson.", "book", "complete_1_lesson"],
    ["Five Lessons", "Completed five lessons.", "stack", "complete_5_lessons"],
    ["Ten Lessons", "Completed ten lessons.", "layers", "complete_10_lessons"],
    ["Level Starter", "Completed a lesson in a new level.", "flag", "complete_level_lesson"],
    ["Quiz Taker", "Submitted a quiz attempt.", "check", "submit_quiz"],
    ["Quiz Pass", "Passed a quiz with at least 70%.", "target", "pass_quiz"],
    ["Perfect Quiz", "Scored 100% on a quiz.", "star", "perfect_quiz"],
    ["Practice Ready", "Opened a practice exercise.", "terminal", "view_exercise"],
    ["Project Explorer", "Opened a guided project.", "map", "view_project"],
    ["Bookmarker", "Bookmarked a lesson.", "bookmark", "create_bookmark"],
    ["Note Keeper", "Saved a lesson note.", "note", "save_note"],
    ["Three Day Streak", "Learned on three different days.", "flame", "streak_3"],
    ["Seven Day Streak", "Learned on seven different days.", "flame", "streak_7"],
    ["C# Basics", "Reached the C# basics path.", "code", "reach_level_2"],
    ["API Builder", "Reached the Web API path.", "api", "reach_level_13"],
    ["Security Mindset", "Reached the security path.", "shield", "reach_level_23"],
    ["Project Builder", "Completed a guided project checklist.", "build", "complete_project"],
    ["Final Exam", "Submitted a final exam.", "award", "submit_final_exam"],
    ["Certificate Earned", "Generated a completion certificate.", "certificate", "generate_certificate"]
  ];
  return items.map(([title, description, icon, condition], index) => ({ id: `achievement-${index + 1}`, title, description, icon, condition }));
}

function chunkTopics(topics, chunks) {
  const size = Math.ceil(topics.length / chunks);
  const result = [];
  for (let i = 0; i < topics.length; i += size) result.push(topics.slice(i, i + size));
  return result;
}

function moduleName(index) {
  return index === 0 ? "Foundations" : index === 1 ? "Applied Practice" : "Professional Patterns";
}

function difficultyFor(order) {
  if (order <= 2) return "Absolute Beginner";
  if (order <= 6) return "Beginner";
  if (order <= 12) return "Intermediate";
  if (order <= 19) return "Advanced";
  return "Professional";
}

function codeFor(topic, order) {
  const safeTopic = safeText(topic);
  const variable = slugify(topic).replaceAll("-", "") || "concept";
  if (order <= 1) return `Console.WriteLine("Learning ${safeTopic}");`;
  if (order <= 4) return `var ${variable} = "${safeTopic}";\nConsole.WriteLine($"Topic: {${variable}}");`;
  if (order <= 7) return `public class Demo\n{\n    public string Topic { get; set; } = "${safeTopic}";\n}\n\nvar demo = new Demo();\nConsole.WriteLine(demo.Topic);`;
  if (order <= 12) return `var items = new[] { "${safeTopic}", "practice", ".NET" };\nvar matches = items.Where(x => x.Contains(".")).ToList();\nConsole.WriteLine(matches.Count);`;
  if (order <= 17) return `app.MapGet("/api/demo", () => Results.Ok(new { topic = "${safeTopic}" }));`;
  return `logger.LogInformation("Applying ${safeTopic} in a production-style .NET system");`;
}

function tagsFor(topic, levelTitle) {
  return [...new Set([...slugify(`${topic} ${levelTitle}`).split("-").filter((x) => x.length > 2).slice(0, 6), "dotnet", "csharp"])];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function safeText(value) {
  return value.replaceAll("\"", "").replaceAll("\\", "");
}
