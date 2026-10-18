import { CheckCircle2, Code2, Copy, Eye, EyeOff, Play, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { codeLabs, getCodeLabProgress, saveCodeLabProgress } from "../data/codeLabs.js";
import { runCodeLabTests } from "../services/codeLabRunner.js";

function getSavedCode(lab) {
  return localStorage.getItem(`rag_mastery_code_${lab.id}`) || lab.starterCode;
}

export default function CodeLabsPage() {
  const [selectedId, setSelectedId] = useState(codeLabs[0].id);
  const selectedLab = codeLabs.find((lab) => lab.id === selectedId) || codeLabs[0];
  const [code, setCode] = useState(() => getSavedCode(selectedLab));
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [progress, setProgress] = useState(() => getCodeLabProgress());

  const stats = useMemo(() => {
    const completed = codeLabs.filter((lab) => progress[lab.id]?.passed).length;
    return {
      completed,
      total: codeLabs.length,
      percent: Math.round((completed / codeLabs.length) * 100)
    };
  }, [progress]);

  function selectLab(lab) {
    setSelectedId(lab.id);
    setCode(getSavedCode(lab));
    setResults([]);
    setError("");
    setShowSolution(false);
  }

  function updateCode(value) {
    setCode(value);
    localStorage.setItem(`rag_mastery_code_${selectedLab.id}`, value);
  }

  async function runTests() {
    setRunning(true);
    setError("");
    const response = await runCodeLabTests(code, selectedLab.tests);
    setRunning(false);
    setResults(response.results || []);
    if (!response.ok) {
      setError(response.error);
      return;
    }

    const passed = response.results.every((result) => result.passed);
    if (passed) {
      const nextProgress = {
        ...progress,
        [selectedLab.id]: {
          passed: true,
          completedAt: new Date().toISOString()
        }
      };
      setProgress(nextProgress);
      saveCodeLabProgress(nextProgress);
    }
  }

  function resetStarter() {
    updateCode(selectedLab.starterCode);
    setResults([]);
    setError("");
  }

  return (
    <div className="page-stack code-labs-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Must-code RAG track</span>
          <h1>Code Labs</h1>
          <p>
            Write real JavaScript for RAG pipeline skills. Tests run locally in your browser with a timeout, so the track
            is free and works without paid APIs.
          </p>
        </div>
        <div className="code-lab-score">
          <Trophy size={22} />
          <strong>
            {stats.completed}/{stats.total}
          </strong>
          <span>{stats.percent}% complete</span>
        </div>
      </section>

      <section className="code-lab-layout">
        <aside className="surface code-lab-list">
          <div className="section-title">
            <h2>Labs</h2>
            <span>{codeLabs.length} required</span>
          </div>
          {codeLabs.map((lab) => (
            <button
              type="button"
              className={lab.id === selectedLab.id ? "selected" : ""}
              key={lab.id}
              onClick={() => selectLab(lab)}
            >
              <span>
                <strong>{lab.title}</strong>
                <small>
                  {lab.module} · {lab.difficulty}
                </small>
              </span>
              {progress[lab.id]?.passed && <CheckCircle2 size={18} />}
            </button>
          ))}
        </aside>

        <main className="code-lab-workspace">
          <section className="surface">
            <div className="section-title">
              <div>
                <h2>{selectedLab.title}</h2>
                <span>
                  {selectedLab.module} · {selectedLab.difficulty} · {selectedLab.estimatedMinutes} min
                </span>
              </div>
              <Code2 size={22} />
            </div>
            <div className="lesson-focus-grid">
              <div>
                <strong>Goal</strong>
                <span>{selectedLab.goal}</span>
              </div>
              <div>
                <strong>Why it matters</strong>
                <span>{selectedLab.whyItMatters}</span>
              </div>
              <div>
                <strong>Validation</strong>
                <span>{selectedLab.tests.length} local tests must pass.</span>
              </div>
            </div>
            <p className="code-lab-instructions">{selectedLab.instructions}</p>
          </section>

          <section className="code-runner-grid">
            <div className="surface">
              <div className="section-title">
                <h2>Editor</h2>
                <div className="button-row">
                  <button className="icon-button" type="button" onClick={resetStarter} title="Reset starter code">
                    <RotateCcw size={17} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(code)}
                    title="Copy code"
                  >
                    <Copy size={17} />
                  </button>
                </div>
              </div>
              <textarea
                className="code-editor"
                spellCheck="false"
                value={code}
                onChange={(event) => updateCode(event.target.value)}
              />
              <button className="primary-button" type="button" onClick={runTests} disabled={running}>
                <Play size={18} />
                {running ? "Running tests..." : "Run Tests"}
              </button>
            </div>

            <div className="surface">
              <div className="section-title">
                <h2>Test Results</h2>
                <span>{results.filter((result) => result.passed).length}/{selectedLab.tests.length} passing</span>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="test-result-list">
                {selectedLab.tests.map((test) => {
                  const result = results.find((item) => item.name === test.name);
                  return (
                    <article className={result?.passed ? "passed" : result ? "failed" : ""} key={test.name}>
                      <strong>{test.name}</strong>
                      <span>{result?.message || "Not run yet"}</span>
                    </article>
                  );
                })}
              </div>

              <button className="secondary-button" type="button" onClick={() => setShowSolution((current) => !current)}>
                {showSolution ? <EyeOff size={18} /> : <Eye size={18} />}
                {showSolution ? "Hide Solution" : "Show Solution"}
              </button>
              {showSolution && (
                <pre className="solution-block">
                  <code>{selectedLab.solution}</code>
                </pre>
              )}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}
