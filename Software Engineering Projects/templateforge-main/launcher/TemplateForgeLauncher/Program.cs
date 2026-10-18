using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;

namespace TemplateForgeLauncher;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            ApplicationConfiguration.Initialize();
            var appRoot = FindAppRoot(AppContext.BaseDirectory);
            if (appRoot is null)
            {
                MessageBox.Show("Could not find TemplateForge's package.json. Keep TemplateForge.exe inside the TemplateForge project folder.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            var node = FindOnPath("node.exe");
            if (node is null)
            {
                MessageBox.Show("Node.js is required to run TemplateForge. Install Node.js, then open TemplateForge again.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            if (!Directory.Exists(Path.Combine(appRoot, "node_modules")))
            {
                var install = RunAndWait("cmd.exe", "/c npm install", appRoot);
                if (install != 0)
                {
                    MessageBox.Show("npm install failed. Open the project folder and run npm install once, then try TemplateForge.exe again.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return install;
                }
            }

            var nextBin = Path.Combine(appRoot, "node_modules", "next", "dist", "bin", "next");
            if (!File.Exists(nextBin))
            {
                MessageBox.Show("Next.js was not found in node_modules. Run npm install, then try again.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            if (args.Contains("--self-test", StringComparer.OrdinalIgnoreCase))
            {
                return FindChrome() is null ? 1 : 0;
            }

            var port = FindFreePort(3000);
            using var server = StartServer(node, nextBin, appRoot, port);
            var url = $"http://127.0.0.1:{port}";

            if (!WaitForServer(url, TimeSpan.FromSeconds(90)).GetAwaiter().GetResult())
            {
                KillProcessTree(server);
                MessageBox.Show("TemplateForge did not start in time. Try running npm run dev to see the server log.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            var chrome = StartChrome(url, appRoot);
            if (chrome is null)
            {
                KillProcessTree(server);
                MessageBox.Show("Google Chrome was not found. Install Chrome or update the launcher with your Chrome path.", "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            chrome.WaitForExit();
            KillProcessTree(server);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "TemplateForge", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static string? FindAppRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory is not null)
        {
            var packageJson = Path.Combine(directory.FullName, "package.json");
            if (File.Exists(packageJson))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return null;
    }

    private static string? FindOnPath(string executable)
    {
        var paths = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        foreach (var path in paths)
        {
            var candidate = Path.Combine(path.Trim('"'), executable);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        var node = Path.Combine(programFiles, "nodejs", executable);
        return File.Exists(node) ? node : null;
    }

    private static int RunAndWait(string fileName, string arguments, string workingDirectory)
    {
        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true
        });

        if (process is null)
        {
            return 1;
        }

        process.WaitForExit();
        return process.ExitCode;
    }

    private static Process StartServer(string node, string nextBin, string workingDirectory, int port)
    {
        var process = Process.Start(new ProcessStartInfo
        {
            FileName = node,
            Arguments = $"\"{nextBin}\" dev --hostname 127.0.0.1 --port {port}",
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        });

        if (process is null)
        {
            throw new InvalidOperationException("Could not start the TemplateForge server.");
        }

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return process;
    }

    private static int FindFreePort(int preferred)
    {
        for (var port = preferred; port < preferred + 50; port++)
        {
            if (IsPortFree(port))
            {
                return port;
            }
        }

        throw new InvalidOperationException("No free local port was found between 3000 and 3049.");
    }

    private static bool IsPortFree(int port)
    {
        try
        {
            var listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            listener.Stop();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static async Task<bool> WaitForServer(string url, TimeSpan timeout)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        var deadline = DateTimeOffset.UtcNow + timeout;

        while (DateTimeOffset.UtcNow < deadline)
        {
            try
            {
                using var response = await client.GetAsync(url);
                if ((int)response.StatusCode < 500)
                {
                    return true;
                }
            }
            catch
            {
                await Task.Delay(800);
            }
        }

        return false;
    }

    private static Process? StartChrome(string url, string appRoot)
    {
        var chrome = FindChrome();
        if (chrome is null)
        {
            return null;
        }

        var profile = Path.Combine(appRoot, ".templateforge-chrome-profile");
        Directory.CreateDirectory(profile);

        return Process.Start(new ProcessStartInfo
        {
            FileName = chrome,
            Arguments = $"--new-window --user-data-dir=\"{profile}\" \"{url}\"",
            UseShellExecute = false
        });
    }

    private static string? FindChrome()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe")
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static void KillProcessTree(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                process.WaitForExit(5000);
            }
        }
        catch
        {
            // The process may already be gone by the time Chrome closes.
        }
    }
}
