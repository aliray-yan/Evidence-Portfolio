using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace JavaMasteryLauncher
{
    internal static class Program
    {
        private const int WebPort = 4188;
        private const int CompilerPort = 4190;
        private static readonly List<Process> StartedProcesses = new List<Process>();
        private static string ProjectRoot = "";
        private static string RuntimeDir = "";
        private static string PidFile = "";
        private static string ChromeProfileDir = "";

        [STAThread]
        private static int Main(string[] args)
        {
            bool selfTest = args.Length > 0 && args[0].Equals("--self-test", StringComparison.OrdinalIgnoreCase);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                ProjectRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                RuntimeDir = Path.Combine(ProjectRoot, ".launcher");
                PidFile = Path.Combine(RuntimeDir, "java-mastery-launcher.pids");
                ChromeProfileDir = Path.Combine(ProjectRoot, ".launcher-profile");
                Directory.CreateDirectory(RuntimeDir);

                LauncherEnvironment environment = ValidateEnvironment();
                if (selfTest) return 0;

                CleanupPreviousRun();
                Process webServer = StartWebServer(environment.PythonPath);
                Process compilerServer = StartCompilerServer(environment.NodePath, environment.JavaHome);
                StartedProcesses.Add(webServer);
                StartedProcesses.Add(compilerServer);

                WaitForUrl("http://127.0.0.1:" + WebPort + "/", 15000, "web server");
                WaitForUrl("http://127.0.0.1:" + CompilerPort + "/health", 15000, "compiler service");

                Process chrome = StartChrome(environment.ChromePath);
                StartedProcesses.Add(chrome);
                WritePidFile();

                WaitForChromeWindowToClose(chrome);
                CleanupStartedProcesses();
                return 0;
            }
            catch (Exception error)
            {
                CleanupStartedProcesses();
                if (selfTest) return 2;
                MessageBox.Show(
                    error.Message,
                    "Java Mastery Launcher",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return 1;
            }
        }

        private static LauncherEnvironment ValidateEnvironment()
        {
            string webDir = Path.Combine(ProjectRoot, "web");
            string compilerScript = Path.Combine(ProjectRoot, "tools", "java-compiler-service", "server.mjs");
            if (!Directory.Exists(webDir)) throw new InvalidOperationException("Could not find the web folder: " + webDir);
            if (!File.Exists(compilerScript)) throw new InvalidOperationException("Could not find compiler service: " + compilerScript);

            string chromePath = FindChromePath();
            string pythonPath = FindExecutable("python.exe", null);
            string nodePath = FindExecutable("node.exe", Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"));
            string javaHome = FindJavaHome();

            if (String.IsNullOrWhiteSpace(chromePath)) throw new InvalidOperationException("Google Chrome was not found. Please install Chrome first.");
            if (String.IsNullOrWhiteSpace(pythonPath)) throw new InvalidOperationException("Python was not found on PATH. It is needed to serve the local web app.");
            if (String.IsNullOrWhiteSpace(nodePath)) throw new InvalidOperationException("Node.js was not found. It is needed for the local Java compiler service.");

            return new LauncherEnvironment(chromePath, pythonPath, nodePath, javaHome);
        }

        private static Process StartWebServer(string pythonPath)
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = pythonPath,
                Arguments = "-m http.server " + WebPort + " --bind 127.0.0.1",
                WorkingDirectory = Path.Combine(ProjectRoot, "web"),
                UseShellExecute = false,
                CreateNoWindow = true
            };
            return Process.Start(startInfo);
        }

        private static Process StartCompilerServer(string nodePath, string javaHome)
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = Quote(Path.Combine("tools", "java-compiler-service", "server.mjs")),
                WorkingDirectory = ProjectRoot,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            if (!String.IsNullOrWhiteSpace(javaHome))
            {
                startInfo.EnvironmentVariables["JAVA_HOME"] = javaHome;
            }
            return Process.Start(startInfo);
        }

        private static Process StartChrome(string chromePath)
        {
            Directory.CreateDirectory(ChromeProfileDir);
            string url = "http://127.0.0.1:" + WebPort + "/?launcher=1&v=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string arguments =
                "--user-data-dir=" + Quote(ChromeProfileDir) + " " +
                "--app=" + Quote(url) + " " +
                "--no-first-run --disable-first-run-ui";

            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = chromePath,
                Arguments = arguments,
                WorkingDirectory = ProjectRoot,
                UseShellExecute = false
            };
            return Process.Start(startInfo);
        }

        private static void WaitForUrl(string url, int timeoutMs, string name)
        {
            DateTime deadline = DateTime.Now.AddMilliseconds(timeoutMs);
            Exception lastError = null;
            while (DateTime.Now < deadline)
            {
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Timeout = 1500;
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if ((int)response.StatusCode >= 200 && (int)response.StatusCode < 500) return;
                    }
                }
                catch (Exception error)
                {
                    lastError = error;
                }
                Thread.Sleep(500);
            }
            throw new TimeoutException("The " + name + " did not start at " + url + ". " + (lastError == null ? "" : lastError.Message));
        }

        private static void WaitForChromeWindowToClose(Process chrome)
        {
            bool profileSeen = false;
            DateTime detectionDeadline = DateTime.Now.AddSeconds(20);
            while (DateTime.Now < detectionDeadline)
            {
                List<int> profilePids = FindChromePidsForProfile();
                if (profilePids.Count > 0)
                {
                    profileSeen = true;
                    break;
                }
                if (chrome != null && chrome.HasExited) break;
                Thread.Sleep(500);
            }

            if (!profileSeen)
            {
                if (chrome != null) chrome.WaitForExit();
                return;
            }

            while (FindChromePidsForProfile().Count > 0)
            {
                Thread.Sleep(1000);
            }
        }

        private static List<int> FindChromePidsForProfile()
        {
            List<int> ids = new List<int>();
            try
            {
                using (ManagementObjectSearcher searcher = new ManagementObjectSearcher("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='chrome.exe'"))
                {
                    foreach (ManagementObject item in searcher.Get())
                    {
                        string commandLine = Convert.ToString(item["CommandLine"]);
                        if (!String.IsNullOrEmpty(commandLine) &&
                            commandLine.IndexOf(ChromeProfileDir, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            ids.Add(Convert.ToInt32(item["ProcessId"]));
                        }
                    }
                }
            }
            catch
            {
                // WMI can fail on locked-down machines. The launcher can still fall back to the root Chrome process.
            }
            return ids;
        }

        private static void CleanupPreviousRun()
        {
            if (!File.Exists(PidFile)) return;
            foreach (string line in File.ReadAllLines(PidFile))
            {
                string[] parts = line.Split('=');
                if (parts.Length != 2) continue;
                int pid;
                if (!Int32.TryParse(parts[1], out pid)) continue;
                TryKillProcess(pid);
            }
            TryDeleteFile(PidFile);
        }

        private static void CleanupStartedProcesses()
        {
            foreach (int pid in FindChromePidsForProfile())
            {
                TryKillProcess(pid);
            }

            for (int index = StartedProcesses.Count - 1; index >= 0; index--)
            {
                Process process = StartedProcesses[index];
                if (process == null) continue;
                TryKillProcess(process.Id);
            }

            TryDeleteFile(PidFile);
        }

        private static void WritePidFile()
        {
            List<string> lines = new List<string>();
            foreach (Process process in StartedProcesses)
            {
                if (process != null && !process.HasExited)
                {
                    lines.Add(process.ProcessName + "=" + process.Id);
                }
            }
            File.WriteAllLines(PidFile, lines.ToArray());
        }

        private static void TryKillProcess(int pid)
        {
            try
            {
                Process process = Process.GetProcessById(pid);
                if (!process.HasExited)
                {
                    process.Kill();
                    process.WaitForExit(3000);
                }
            }
            catch
            {
                // Process already exited or is not ours anymore.
            }
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
                // Non-fatal.
            }
        }

        private static string FindChromePath()
        {
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string[] candidates =
            {
                Path.Combine(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(programFilesX86, "Google", "Chrome", "Application", "chrome.exe")
            };

            foreach (string candidate in candidates)
            {
                if (File.Exists(candidate)) return candidate;
            }
            return FindExecutable("chrome.exe", null);
        }

        private static string FindExecutable(string name, string fallback)
        {
            if (!String.IsNullOrWhiteSpace(fallback) && File.Exists(fallback)) return fallback;
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string directory in path.Split(Path.PathSeparator))
            {
                if (String.IsNullOrWhiteSpace(directory)) continue;
                try
                {
                    string candidate = Path.Combine(directory.Trim(), name);
                    if (File.Exists(candidate)) return candidate;
                }
                catch
                {
                    // Ignore malformed PATH entries.
                }
            }
            return null;
        }

        private static string FindJavaHome()
        {
            string existing = Environment.GetEnvironmentVariable("JAVA_HOME");
            if (!String.IsNullOrWhiteSpace(existing) && Directory.Exists(existing)) return existing;

            string androidStudioJbr = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "Android",
                "Android Studio",
                "jbr"
            );
            return Directory.Exists(androidStudioJbr) ? androidStudioJbr : "";
        }

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }
    }

    internal sealed class LauncherEnvironment
    {
        public readonly string ChromePath;
        public readonly string PythonPath;
        public readonly string NodePath;
        public readonly string JavaHome;

        public LauncherEnvironment(string chromePath, string pythonPath, string nodePath, string javaHome)
        {
            ChromePath = chromePath;
            PythonPath = pythonPath;
            NodePath = nodePath;
            JavaHome = javaHome;
        }
    }
}
