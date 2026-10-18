using System.Diagnostics;
using DotNetMastery.Api.DTOs;

namespace DotNetMastery.Api.Services;

public class CSharpRunnerService(ILogger<CSharpRunnerService> logger)
{
    private const int MaxCodeLength = 12_000;
    private const int ExecutionTimeoutMs = 12_000;
    private static readonly string[] BlockedTokens =
    [
        "System.IO.File",
        "System.IO.Directory",
        "File.",
        "Directory.",
        "Process.",
        "System.Diagnostics",
        "Environment.",
        "HttpClient",
        "Socket",
        "Thread.Sleep",
        "Task.Delay",
        "while(true)",
        "while (true)"
    ];

    public async Task<RunCodeResult> RunAsync(string code, string? stdin = null, CancellationToken cancellationToken = default)
    {
        var diagnostics = Validate(code);
        if (diagnostics.Count > 0)
        {
            return new RunCodeResult(false, "", string.Join(Environment.NewLine, diagnostics), -1, false, 0, diagnostics);
        }

        var root = Path.Combine(Path.GetTempPath(), "dotnet-mastery-runs", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);

        try
        {
            await File.WriteAllTextAsync(Path.Combine(root, "Runner.csproj"), ProjectFile(), cancellationToken);
            await File.WriteAllTextAsync(Path.Combine(root, "Program.cs"), code, cancellationToken);

            return await RunDotnetAsync(root, stdin, cancellationToken);
        }
        finally
        {
            try
            {
                Directory.Delete(root, recursive: true);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Failed to clean temporary code runner directory {Directory}", root);
            }
        }
    }

    public static string NormalizeOutput(string? output) =>
        string.Join(
            Environment.NewLine,
            (output ?? string.Empty)
                .Replace("\r\n", "\n")
                .Replace('\r', '\n')
                .Split('\n')
                .Select(x => x.TrimEnd())
                .Where(x => x.Length > 0))
        .Trim();

    private async Task<RunCodeResult> RunDotnetAsync(string workingDirectory, string? stdin, CancellationToken cancellationToken)
    {
        var start = Stopwatch.StartNew();
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "run --no-launch-profile",
            WorkingDirectory = workingDirectory,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        process.Start();

        if (!string.IsNullOrEmpty(stdin))
        {
            await process.StandardInput.WriteAsync(stdin.AsMemory(), cancellationToken);
        }
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        var exited = await Task.Run(() => process.WaitForExit(ExecutionTimeoutMs), cancellationToken);
        var timedOut = !exited;

        if (timedOut)
        {
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch
            {
                // Process may have exited between timeout detection and kill.
            }
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        start.Stop();

        return new RunCodeResult(
            Success: !timedOut && process.ExitCode == 0,
            Stdout: stdout,
            Stderr: timedOut ? $"{stderr}{Environment.NewLine}Execution timed out after {ExecutionTimeoutMs / 1000} seconds." : stderr,
            ExitCode: timedOut ? -1 : process.ExitCode,
            TimedOut: timedOut,
            ElapsedMs: (int)start.ElapsedMilliseconds,
            Diagnostics: []);
    }

    private static List<string> Validate(string code)
    {
        var diagnostics = new List<string>();
        if (string.IsNullOrWhiteSpace(code))
        {
            diagnostics.Add("Code is required.");
        }

        if (code.Length > MaxCodeLength)
        {
            diagnostics.Add($"Code is too long. Keep practice snippets under {MaxCodeLength} characters.");
        }

        var compact = code.Replace(" ", string.Empty, StringComparison.Ordinal);
        foreach (var token in BlockedTokens)
        {
            var candidate = token.Contains(' ') ? code : compact;
            var needle = token.Replace(" ", string.Empty, StringComparison.Ordinal);
            if (candidate.Contains(needle, StringComparison.OrdinalIgnoreCase))
            {
                diagnostics.Add($"This local practice runner blocks `{token}` for safety. Keep snippets focused on console learning tasks.");
            }
        }

        return diagnostics;
    }

    private static string ProjectFile() =>
        """
        <Project Sdk="Microsoft.NET.Sdk">
          <PropertyGroup>
            <OutputType>Exe</OutputType>
            <TargetFramework>net10.0</TargetFramework>
            <ImplicitUsings>enable</ImplicitUsings>
            <Nullable>enable</Nullable>
          </PropertyGroup>
        </Project>
        """;
}
