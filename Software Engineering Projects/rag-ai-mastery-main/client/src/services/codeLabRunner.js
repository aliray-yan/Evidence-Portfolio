export function runCodeLabTests(code, tests, timeoutMs = 1600) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("../workers/codeRunner.worker.js", import.meta.url), { type: "module" });
    const timer = window.setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        error: "Code timed out. Check for infinite loops or very slow logic.",
        results: []
      });
    }, timeoutMs);

    worker.onmessage = (event) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (error) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve({
        ok: false,
        error: error.message || "Code runner failed.",
        results: []
      });
    };

    worker.postMessage({ code, tests });
  });
}
