import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 4190);

function command(name) {
  if (!process.env.JAVA_HOME) return name;
  const suffix = process.platform === "win32" ? ".exe" : "";
  return path.join(process.env.JAVA_HOME, "bin", `${name}${suffix}`);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function runProcess(cmd, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      stderr += "\nProcess timed out.";
    }, options.timeoutMs || 8000);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function writeProject(workDir, files) {
  for (const file of files) {
    if (!file.path.endsWith(".java")) throw new Error(`Only .java files are allowed: ${file.path}`);
    if (file.path.includes("..")) throw new Error(`Unsafe path: ${file.path}`);
    const target = path.join(workDir, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content || "", "utf8");
  }
}

async function compileAndRun(payload) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  const tests = Array.isArray(payload.tests) ? payload.tests : [];
  const mainClass = payload.mainClass || "Main";
  if (!files.length) throw new Error("No files provided.");

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "java-mastery-"));
  try {
    await writeProject(workDir, files);
    const javaFiles = files.map(file => file.path);
    const compile = await runProcess(command("javac"), javaFiles, { cwd: workDir, timeoutMs: 10000 });
    const runnableTests = tests.filter(test => test.id?.endsWith("-smoke") || /compile and run/i.test(test.name || ""));
    const results = [];

    if (compile.code === 0) {
      for (const test of runnableTests) {
        const run = await runProcess(command("java"), [mainClass], {
          cwd: workDir,
          input: test.input || "",
          timeoutMs: 8000
        });
        const actual = run.stdout.trim();
        const expected = String(test.expectedOutput || "").trim();
        results.push({
          id: test.id,
          name: test.name,
          passed: run.code === 0 && actual === expected,
          expectedOutput: expected,
          actualOutput: actual,
          stderr: run.stderr.trim(),
          points: test.points || 0
        });
      }
    }

    const possible = runnableTests.reduce((sum, test) => sum + (test.points || 0), 0);
    const earned = results.filter(test => test.passed).reduce((sum, test) => sum + (test.points || 0), 0);
    return {
      ok: compile.code === 0 && results.every(test => test.passed),
      compile,
      tests: results,
      score: possible ? Math.round((earned / possible) * 100) : 0,
      note: "This service runs only compile/smoke tests. Use the app rubric for structure, validation, readability, and test-thinking points."
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "Java Mastery Compiler Service" }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/run") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Use POST /run" }));
    return;
  }

  try {
    const payload = JSON.parse(await readBody(request));
    const result = await compileAndRun(payload);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result, null, 2));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: error.message }, null, 2));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Java Mastery compiler service running at http://127.0.0.1:${PORT}`);
  console.log("Set JAVA_HOME to a JDK if javac/java are not on PATH.");
});
