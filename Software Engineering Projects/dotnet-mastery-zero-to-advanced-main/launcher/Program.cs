using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;

const string BackendUrl = "http://localhost:5148";
const string FrontendUrl = "http://127.0.0.1:5173";
const string PostgresHost = "127.0.0.1";
const string PostgresPort = "55432";
const string PostgresDb = "dotnet_mastery";
const string PostgresUser = "dotnet_mastery";
const string PostgresPassword = "12345";

var root = FindProjectRoot();
var launcherDir = Path.Combine(root, ".launcher");
var logDir = Path.Combine(launcherDir, "logs");
Directory.CreateDirectory(logDir);

var startedProcesses = new List<Process>();
var cleanedUp = false;
var smokeTest = args.Contains("--smoke-test", StringComparer.OrdinalIgnoreCase);

Console.Title = ".NET Mastery Launcher";
Console.WriteLine(".NET Mastery launcher");
Console.WriteLine($"Project: {root}");
Console.WriteLine();

if (args.Contains("--self-test", StringComparer.OrdinalIgnoreCase))
{
    Console.WriteLine("Self-test mode");
    Console.WriteLine($"dotnet: {(RunCommand("dotnet", "--version", root, TimeSpan.FromSeconds(15), allowFailure: true) == 0 ? "found" : "missing")}");
    Console.WriteLine($"npm: {(RunCommand(NpmCommand(), "--version", root, TimeSpan.FromSeconds(15), allowFailure: true) == 0 ? "found" : "missing")}");
    Console.WriteLine($"docker: {(RunCommand("docker", "--version", root, TimeSpan.FromSeconds(15), allowFailure: true) == 0 ? "found" : "missing")}");
    Console.WriteLine($"chrome: {(FindChrome() is null ? "not found on common paths" : "found")}");
    return;
}

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    Cleanup();
    Environment.Exit(0);
};

AppDomain.CurrentDomain.ProcessExit += (_, _) => Cleanup();

try
{
    EnsureCommand("dotnet", "Install .NET SDK 10+ and make sure dotnet is on PATH.");
    EnsureCommand(NpmCommand(), "Install Node.js 22+ and make sure npm is on PATH.");
    StopProcessesOnPorts(root, [5148, 5173]);
    EnsureDocker(root);
    EnsureNodePackages(root);

    var backendLog = Path.Combine(logDir, "backend.log");
    var backend = StartLoggedProcess(
        "dotnet",
        "run --no-launch-profile --project server",
        root,
        backendLog,
        environment: new Dictionary<string, string>
        {
            ["ASPNETCORE_URLS"] = BackendUrl,
            ["DOTNET_MASTERY_CONNECTION"] = BuildConnectionString()
        });
    startedProcesses.Add(backend);
    await WaitForUrl($"{BackendUrl}/api/health", "ASP.NET Core API");
    await EnsureDemoLoginReady(root, backendLog);

    var frontend = StartLoggedProcess(
        NpmCommand(),
        "run dev -- --host 127.0.0.1 --port 5173",
        Path.Combine(root, "client"),
        Path.Combine(logDir, "frontend.log"));
    startedProcesses.Add(frontend);
    await WaitForUrl(FrontendUrl, "React frontend");

    if (smokeTest)
    {
        Console.WriteLine("Smoke test passed. Services reached ready state.");
        return;
    }

    Console.WriteLine();
    Console.WriteLine("Opening Chrome. Close the Chrome app window to stop .NET Mastery.");
    var chrome = StartChrome(root, FrontendUrl);
    if (chrome is not null)
    {
        await chrome.WaitForExitAsync();
    }
    else
    {
        Console.WriteLine("Chrome was opened through Windows shell, so I cannot monitor its window directly.");
        Console.WriteLine("Press Enter here when you want to stop the app.");
        Console.ReadLine();
    }
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine();
    Console.WriteLine(ex.Message);
    Console.ResetColor();
    Console.WriteLine();
    Console.WriteLine($"Logs: {logDir}");
    Console.WriteLine("Press Enter to close.");
    Console.ReadLine();
}
finally
{
    Cleanup();
}

void Cleanup()
{
    if (cleanedUp) return;
    cleanedUp = true;

    Console.WriteLine();
    Console.WriteLine("Stopping .NET Mastery services...");

    foreach (var process in startedProcesses.Where(process => !process.HasExited).Reverse())
    {
        try
        {
            process.Kill(entireProcessTree: true);
            process.WaitForExit(10_000);
        }
        catch
        {
            // Process may have already exited while cleanup was starting.
        }
    }

    StopProcessesOnPorts(root, [5148, 5173]);
    RunCommand("docker", "compose down", root, TimeSpan.FromSeconds(45), allowFailure: true);
    Console.WriteLine("Done.");
}

static string FindProjectRoot()
{
    var current = new DirectoryInfo(AppContext.BaseDirectory);
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "docker-compose.yml"))
            && Directory.Exists(Path.Combine(current.FullName, "client"))
            && Directory.Exists(Path.Combine(current.FullName, "server")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new InvalidOperationException("Could not find the dotnet-mastery project root. Keep the launcher inside this project folder.");
}

static void EnsureDocker(string workingDirectory)
{
    if (RunCommand("docker", "info", workingDirectory, TimeSpan.FromSeconds(10), allowFailure: true) != 0)
    {
        TryStartDockerDesktop();
        Console.WriteLine("Waiting for Docker Desktop...");
        var ready = WaitForCommand("docker", "info", workingDirectory, TimeSpan.FromMinutes(5));
        if (!ready)
        {
            throw new InvalidOperationException("Docker is not running. Start Docker Desktop, then run this launcher again.");
        }
    }

    Console.WriteLine("Starting PostgreSQL with Docker Compose...");
    var code = RunCommand("docker", "compose up -d", workingDirectory, TimeSpan.FromMinutes(3), allowFailure: false);
    if (code != 0)
    {
        throw new InvalidOperationException("Docker Compose failed to start PostgreSQL.");
    }

    Console.Write("Waiting for PostgreSQL");
    var postgresReady = WaitForCommand("docker", $"compose exec -T postgres pg_isready -U {PostgresUser} -d {PostgresDb}", workingDirectory, TimeSpan.FromMinutes(2), showProgress: true);
    if (!postgresReady)
    {
        throw new InvalidOperationException("PostgreSQL did not become ready. Open Docker Desktop and check the dotnet-mastery-postgres container.");
    }
}

static void StopProcessesOnPorts(string workingDirectory, int[] ports)
{
    if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
        return;
    }

    var portList = string.Join(",", ports);
    var script =
        $"$ports=@({portList}); " +
        "Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue | " +
        "Select-Object -ExpandProperty OwningProcess -Unique | " +
        "Where-Object { $_ -and $_ -ne $PID } | " +
        "ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }";

    RunCommand("powershell.exe", $"-NoProfile -ExecutionPolicy Bypass -Command \"{script}\"", workingDirectory, TimeSpan.FromSeconds(20), allowFailure: true);
}

static string BuildConnectionString()
{
    return $"Host={PostgresHost};Port={PostgresPort};Database={PostgresDb};Username={PostgresUser};Password={PostgresPassword}";
}

static void TryStartDockerDesktop()
{
    var candidates = new[]
    {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Docker", "Docker", "Docker Desktop.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Docker", "Docker", "Docker Desktop.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Docker", "Docker Desktop.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "DockerDesktop", "Docker Desktop.exe")
    };

    var dockerDesktop = candidates.FirstOrDefault(File.Exists);
    if (dockerDesktop is null) return;

    Console.WriteLine("Starting Docker Desktop...");
    Process.Start(new ProcessStartInfo
    {
        FileName = dockerDesktop,
        UseShellExecute = true,
        WindowStyle = ProcessWindowStyle.Minimized
    });
}

static void EnsureNodePackages(string root)
{
    var nodeModules = Path.Combine(root, "client", "node_modules");
    if (Directory.Exists(nodeModules)) return;

    Console.WriteLine("Installing frontend packages...");
    var code = RunCommand(NpmCommand(), "install", Path.Combine(root, "client"), TimeSpan.FromMinutes(5), allowFailure: false);
    if (code != 0)
    {
        throw new InvalidOperationException("npm install failed. Check your Node.js/npm setup.");
    }
}

static Process StartLoggedProcess(string fileName, string arguments, string workingDirectory, string logPath, Dictionary<string, string>? environment = null)
{
    Console.WriteLine($"Starting {fileName} {arguments}");
    var output = new StreamWriter(File.Open(logPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite)) { AutoFlush = true };
    var process = new Process
    {
        StartInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        },
        EnableRaisingEvents = true
    };

    if (environment is not null)
    {
        foreach (var pair in environment)
        {
            process.StartInfo.Environment[pair.Key] = pair.Value;
        }
    }

    process.OutputDataReceived += (_, args) =>
    {
        if (args.Data is not null) output.WriteLine(args.Data);
    };
    process.ErrorDataReceived += (_, args) =>
    {
        if (args.Data is not null) output.WriteLine(args.Data);
    };
    process.Exited += (_, _) => output.Dispose();

    process.Start();
    process.BeginOutputReadLine();
    process.BeginErrorReadLine();
    return process;
}

static async Task WaitForUrl(string url, string name)
{
    Console.Write($"Waiting for {name}");
    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
    var deadline = DateTimeOffset.UtcNow.AddMinutes(2);
    while (DateTimeOffset.UtcNow < deadline)
    {
        try
        {
            using var response = await client.GetAsync(url);
            if ((int)response.StatusCode < 500)
            {
                Console.WriteLine(" ready.");
                return;
            }
        }
        catch
        {
            // Server is still starting.
        }

        Console.Write(".");
        await Task.Delay(1000);
    }

    throw new TimeoutException($"{name} did not become ready at {url}.");
}

static async Task EnsureDemoLoginReady(string root, string backendLog)
{
    if (await WaitForDemoLogin(TimeSpan.FromSeconds(90)))
    {
        return;
    }

    if (LogContains(backendLog, "password authentication failed"))
    {
        Console.WriteLine();
        Console.WriteLine("Detected an old PostgreSQL password for this local database. Repairing it now...");
        var repaired = RunCommandWithArgs(
            "docker",
            ["compose", "exec", "-T", "postgres", "psql", "-U", PostgresUser, "-d", PostgresDb, "-c", $"ALTER USER {PostgresUser} WITH PASSWORD '{PostgresPassword}';"],
            root,
            TimeSpan.FromSeconds(45),
            allowFailure: true) == 0;

        if (repaired && await WaitForDemoLogin(TimeSpan.FromSeconds(45)))
        {
            return;
        }
    }

    Console.WriteLine();
    Console.WriteLine("Demo login was not ready yet. The app will still open, but login may fail until the database is fixed.");
    Console.WriteLine($"Backend log: {backendLog}");
}

static async Task<bool> WaitForDemoLogin(TimeSpan timeout)
{
    Console.Write("Waiting for seeded demo login");
    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    var deadline = DateTimeOffset.UtcNow.Add(timeout);

    while (DateTimeOffset.UtcNow < deadline)
    {
        try
        {
            using var payload = new StringContent(
                "{\"email\":\"student@dotnetmastery.local\",\"password\":\"Student123!\"}",
                Encoding.UTF8,
                "application/json");
            using var response = await client.PostAsync($"{BackendUrl}/api/auth/login", payload);
            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine(" ready.");
                return true;
            }
        }
        catch
        {
            // Database migrations/seeding may still be running.
        }

        Console.Write(".");
        await Task.Delay(1000);
    }

    return false;
}

static Process? StartChrome(string root, string url)
{
    var chrome = FindChrome();
    var profile = Path.Combine(root, ".launcher", "chrome-profile");
    Directory.CreateDirectory(profile);
    var args = $"--user-data-dir=\"{profile}\" --disable-background-mode --no-first-run --new-window --app=\"{url}\"";

    if (chrome is not null)
    {
        return Process.Start(new ProcessStartInfo
        {
            FileName = chrome,
            Arguments = args,
            UseShellExecute = false
        });
    }

    Process.Start(new ProcessStartInfo
    {
        FileName = "chrome.exe",
        Arguments = args,
        UseShellExecute = true
    });
    return null;
}

static string? FindChrome()
{
    var candidates = new[]
    {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe")
    };

    return candidates.FirstOrDefault(File.Exists);
}

static void EnsureCommand(string fileName, string installMessage)
{
    if (RunCommand(fileName, "--version", Directory.GetCurrentDirectory(), TimeSpan.FromSeconds(15), allowFailure: true) != 0)
    {
        throw new InvalidOperationException($"{fileName} was not found. {installMessage}");
    }
}

static bool WaitForCommand(string fileName, string arguments, string workingDirectory, TimeSpan timeout, bool showProgress = false)
{
    var deadline = DateTimeOffset.UtcNow.Add(timeout);
    while (DateTimeOffset.UtcNow < deadline)
    {
        if (RunCommand(fileName, arguments, workingDirectory, TimeSpan.FromSeconds(10), allowFailure: true) == 0)
        {
            if (showProgress) Console.WriteLine(" ready.");
            return true;
        }

        if (showProgress) Console.Write(".");
        Thread.Sleep(3000);
    }

    return false;
}

static int RunCommand(string fileName, string arguments, string workingDirectory, TimeSpan timeout, bool allowFailure)
{
    try
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.Start();
        if (!process.WaitForExit((int)timeout.TotalMilliseconds))
        {
            process.Kill(entireProcessTree: true);
            return -1;
        }

        return process.ExitCode;
    }
    catch when (allowFailure)
    {
        return -1;
    }
}

static int RunCommandWithArgs(string fileName, IReadOnlyList<string> arguments, string workingDirectory, TimeSpan timeout, bool allowFailure)
{
    try
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        process.Start();
        if (!process.WaitForExit((int)timeout.TotalMilliseconds))
        {
            process.Kill(entireProcessTree: true);
            return -1;
        }

        return process.ExitCode;
    }
    catch when (allowFailure)
    {
        return -1;
    }
}

static bool LogContains(string logPath, string value)
{
    try
    {
        return File.Exists(logPath)
            && File.ReadAllText(logPath).Contains(value, StringComparison.OrdinalIgnoreCase);
    }
    catch
    {
        return false;
    }
}

static string NpmCommand()
{
    if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
        return "npm";
    }

    return FindOnPath("npm.cmd") ?? "npm.cmd";
}

static string? FindOnPath(string executable)
{
    var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
    foreach (var directory in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
    {
        var candidate = Path.Combine(directory.Trim('"'), executable);
        if (File.Exists(candidate))
        {
            return candidate;
        }
    }

    return null;
}
