# .NET Mastery: Zero to Advanced

Created for local development by **Ali Rayyan**.

.NET Mastery is a full-stack learning platform for teaching programming, C#, .NET, ASP.NET Core, EF Core, APIs, Blazor, desktop development, testing, architecture, security, deployment, performance, and real-world projects from absolute beginner to professional level.

Demo credentials are for local development only:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@dotnetmastery.local` | `Admin123!` |
| Student | `student@dotnetmastery.local` | `Student123!` |

## Features

- Landing page, authentication, protected learner dashboard, profile, settings, and dark/light mode.
- Learning path with levels, modules, lessons, code examples, quizzes, final exams, practice exercises, guided projects, bookmarks, notes, progress tracking, skill tree, achievements, streaks, and certificate generation.
- Practice exercises include an authenticated C# runner/grader in the web app and a standalone offline output grader in the Android APK.
- Guided project checklists persist per learner so project checkpoints survive page refreshes and app restarts.
- Admin dashboard for platform stats and CRUD content management for levels, modules, lessons, quiz questions, practice exercises, and guided projects.
- Secure password hashing with PBKDF2, JWT authentication, role-based admin routes, validation, CORS configuration, global API error handling, and environment-based secrets.
- Seed data generator creates 26 levels, 50+ modules, 150+ lessons, 600+ quiz questions, 50+ practice exercises, 15 guided projects, 20 achievements, and demo users.

## Tech Stack

- Frontend: React, Vite, plain CSS, React Router, lucide-react icons.
- Backend: ASP.NET Core Web API, C#, EF Core, PostgreSQL, JWT bearer authentication.
- Database: PostgreSQL via Docker Compose.
- API tooling: OpenAPI endpoint in development at `/openapi/v1.json`.

## Folder Structure

```text
dotnet-mastery/
  client/
    src/components/
    src/context/
    src/hooks/
    src/layouts/
    src/pages/
    src/routes/
    src/services/
    src/styles/
    src/utils/
  server/
    Controllers/
    Data/
    DTOs/
    Middleware/
    Migrations/
    Models/
    Seed/
    Services/
    Program.cs
    appsettings.json
  server.Tests/
    DotNetMastery.Api.Tests.csproj
    Program.cs
  docker-compose.yml
  .env.example
  README.md
```

## Installation

Requirements:

- .NET SDK 10+
- Node.js 22+
- Docker Desktop or another PostgreSQL instance

Install frontend packages:

```bash
cd client
npm install
```

Restore/build backend:

```bash
cd server
dotnet restore
dotnet build
```

## Database Setup

From the project root:

```bash
docker compose up -d
```

The default connection string is:

```text
Host=127.0.0.1;Port=55432;Database=dotnet_mastery;Username=dotnet_mastery;Password=12345
```

You can override it with:

```bash
DOTNET_MASTERY_CONNECTION="Host=127.0.0.1;Port=55432;Database=dotnet_mastery;Username=dotnet_mastery;Password=12345"
```

## EF Core Migration Commands

The repository includes a local `dotnet-ef` tool manifest and an `InitialCreate` migration.

```bash
dotnet tool restore
dotnet tool run dotnet-ef database update --project server --startup-project server
```

To add another migration:

```bash
dotnet tool run dotnet-ef migrations add YourMigrationName --project server --startup-project server --output-dir Migrations
```

If the local tool runner asks for restore even after `dotnet tool restore` on Windows, use the restored tool directly:

```powershell
dotnet "$env:USERPROFILE\.nuget\packages\dotnet-ef\10.0.9\tools\net8.0\any\dotnet-ef.dll" database update --project server --startup-project server
```

Startup applies migrations with `Database.MigrateAsync()` and then runs the seed routine.

## Seed Data

Seed data runs automatically when the API starts and the database is reachable. It creates the curriculum, quizzes, exercises, projects, achievements, and demo users.

To reseed from scratch in local development:

```bash
docker compose down -v
docker compose up -d
cd server
dotnet run
```

## Running Backend

```bash
cd server
dotnet run
```

Common local URLs:

- API: `http://localhost:5148/api/health`
- OpenAPI JSON: `http://localhost:5148/openapi/v1.json`

If the API chooses a different port, copy that port into `client/.env`:

```text
VITE_API_URL=http://localhost:YOUR_PORT/api
```

## Running Frontend

```bash
cd client
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## One-Click Windows Launcher

For normal daily use on Windows, double-click the `.NET Mastery` desktop shortcut or run:

```text
builds/windows/DotNetMasteryLauncher.exe
```

Docker is used by the launcher only to start a private PostgreSQL database automatically. If you run the backend manually against an already-installed local PostgreSQL instance, Docker is not required.

The launcher will:

- Start Docker Desktop if it can find it.
- Run `docker compose up -d` for PostgreSQL.
- Install frontend packages with `npm install` if `client/node_modules` is missing.
- Clear old processes listening on this app's ports `5148` and `5173`.
- Start the ASP.NET Core API on `http://localhost:5148`.
- Start the React/Vite frontend on `http://127.0.0.1:5173`.
- Open the web app in a separate Google Chrome app window.
- Stop the API, frontend, and Docker Compose stack when that Chrome app window closes.

Launcher logs are written to:

```text
.launcher/logs/
```

Docker Desktop will show this app's database container as `dotnet-mastery-postgres`. That is separate from older containers such as `rag-ai-mastery`; the launcher only manages this project's Docker Compose stack.

To rebuild the launcher executable:

```powershell
dotnet publish launcher -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true /p:PublishTrimmed=false -o builds/windows
```

## Automated Tests

Backend runner tests:

```bash
dotnet run --project server.Tests
```

Frontend/standalone seed tests:

```bash
cd client
npm test
```

## Android APK

The Android build is a standalone/offline Capacitor edition. It does not require the ASP.NET API, PostgreSQL, Docker, Wi-Fi, or `localhost` after installation. Curriculum content, learner data, and project checklist progress are stored locally on the phone with browser/WebView storage.

Important runner difference:

- Web app: practice grading uses the ASP.NET Core `/api/code/run` and `/api/practice-exercises/{id}/grade` endpoints and runs real C# snippets through `dotnet run`.
- Android APK: practice grading is fully offline and checks beginner console tasks by reading `Console.WriteLine("text")` output. It is independent, but it is not a full C# compiler inside the APK.

Build the standalone web bundle and sync Android:

```bash
cd client
npm run build:android
npm run android:sync
```

Build a debug APK:

```powershell
cd client/android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\Ali Rayyan\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
.\gradlew.bat assembleDebug
```

Generated APK:

```text
builds/android/dotnet-mastery-standalone-debug.apk
```

This debug APK is installable for testing. For Play Store or public distribution, create a signed release APK/AAB with a private signing key.

The current refreshed debug artifact is:

```text
builds/android/dotnet-mastery-standalone-debug.apk
```

## Admin Panel Usage

Login with the local admin account, then open `/admin`.

The admin CMS has tabs for:

- Levels
- Modules
- Lessons
- Quiz questions
- Practice exercises
- Guided projects

Select a record to edit its JSON payload, or use the sample payload to create a new record. GUID relationships such as `levelId` and `moduleId` must point to existing records.

## How To Add Lessons

Use `/admin`, choose `Lessons`, and provide:

- `moduleId`
- `title`
- `slug`
- `difficulty`
- `estimatedMinutes`
- all lesson-format fields: simple explanation, ELI10, analogy, why it matters, code example, line-by-line explanation, common mistakes, mini practice, summary, next lesson, and tags

## How To Add Quizzes

Use `/admin`, choose `Quiz Questions`, and connect each question to a `lessonId`, `moduleId`, or `levelId`.

Supported types:

- `mcq`
- `true-false`
- `code-output`
- `bug-fixing`
- `scenario`
- `final-exam`

Each question stores options, correct answer, and explanation.

## How To Add Projects

Use `/admin`, choose `Guided Projects`, and provide the module, title, difficulty, description, requirements, steps, expected result, starter code, final code, explanation, and extension ideas.

## Build For Production

Backend:

```bash
cd server
dotnet publish -c Release -o publish
```

Frontend:

```bash
cd client
npm run build
```

Set production secrets through environment variables:

- `DOTNET_MASTERY_CONNECTION`
- `DOTNET_MASTERY_JWT_SECRET`
- `VITE_API_URL`

## Security Notes

- Demo credentials are local-only and must be changed or removed before production.
- Passwords are hashed with PBKDF2 and never stored as plain text.
- JWT secrets must be long, random, and stored outside source control.
- Admin endpoints require the `Admin` role.
- CORS is restricted to local frontend origins by default.
- Do not commit `.env` files or production connection strings.
- Use HTTPS, secure proxy headers, rate limiting, audit logging, and managed secret storage for real deployment.

## Troubleshooting

- API cannot connect to database: run `docker compose up -d` and verify port `55432` is free.
- Local PostgreSQL uses a different password: set `DOTNET_MASTERY_CONNECTION`, for example `Host=127.0.0.1;Port=55432;Database=dotnet_mastery;Username=dotnet_mastery;Password=12345`.
- Frontend login fails: confirm backend is running and `VITE_API_URL` points to the API port.
- Practice grader says output does not match: compare line order, spelling, punctuation, and extra text. The generated tasks intentionally use exact output checks.
- Android grader cannot run a snippet: use literal `Console.WriteLine("text");` statements in the APK, or use the web app for full C# compilation.
- Missing tables: restart the API after PostgreSQL is healthy, or run `dotnet ef database update` if using migrations.
- JWT validation fails: ensure `DOTNET_MASTERY_JWT_SECRET` is at least 32 characters and consistent across restarts.
- Admin tab save fails: verify required GUIDs point to existing level/module/lesson records.

## Future Roadmap

- Rich markdown lesson authoring.
- More hand-authored deep lessons for every topic.
- Advanced multi-file C# runner with input cases and stronger sandboxing.
- Automatic grading for non-console exercises.
- Instructor analytics and cohort management.
- Certificate PDF export.
- Refresh tokens and account recovery.
- Broader automated test suite with API integration tests and browser UI tests.
- Azure App Service and GitHub Actions deployment templates.
