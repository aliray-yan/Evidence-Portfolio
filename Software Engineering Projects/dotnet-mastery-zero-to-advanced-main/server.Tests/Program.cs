using DotNetMastery.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

var tests = new (string Name, Func<Task> Run)[]
{
    ("normalizes console output", TestNormalizeOutput),
    ("blocks unsafe runner tokens", TestBlocksUnsafeTokens),
    ("runs a small C# console snippet", TestRunsConsoleSnippet)
};

var failures = new List<string>();
foreach (var test in tests)
{
    try
    {
        await test.Run();
        Console.WriteLine($"[pass] {test.Name}");
    }
    catch (Exception ex)
    {
        failures.Add($"{test.Name}: {ex.Message}");
        Console.Error.WriteLine($"[fail] {test.Name}: {ex.Message}");
    }
}

if (failures.Count == 0)
{
    Console.WriteLine($"{tests.Length} backend tests passed.");
    return 0;
}

Console.Error.WriteLine($"{failures.Count} backend test(s) failed.");
return 1;

static Task TestNormalizeOutput()
{
    var normalized = CSharpRunnerService.NormalizeOutput("  First  \r\n\r\nSecond   \n");
    AssertEqual($"First{Environment.NewLine}Second", normalized);
    return Task.CompletedTask;
}

static async Task TestBlocksUnsafeTokens()
{
    var runner = new CSharpRunnerService(NullLogger<CSharpRunnerService>.Instance);
    var result = await runner.RunAsync("System.IO.File.ReadAllText(\"secret.txt\");");
    AssertFalse(result.Success, "Unsafe code should not run.");
    AssertTrue(result.Diagnostics.Count > 0, "Unsafe code should return diagnostics.");
}

static async Task TestRunsConsoleSnippet()
{
    var runner = new CSharpRunnerService(NullLogger<CSharpRunnerService>.Instance);
    var result = await runner.RunAsync("Console.WriteLine(\"Hello from tests\");");
    AssertTrue(result.Success, result.Stderr);
    AssertEqual("Hello from tests", CSharpRunnerService.NormalizeOutput(result.Stdout));
}

static void AssertEqual<T>(T expected, T actual)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
    {
        throw new InvalidOperationException($"Expected `{expected}`, got `{actual}`.");
    }
}

static void AssertTrue(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

static void AssertFalse(bool condition, string message)
{
    if (condition) throw new InvalidOperationException(message);
}
