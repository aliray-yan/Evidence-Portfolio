import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import CodeBlock from "../components/CodeBlock.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function ExercisesPage() {
  const [params] = useSearchParams();
  const moduleId = params.get("moduleId");
  const { data, error, loading } = useAsync(() => api.exercises(moduleId), [moduleId]);
  const [open, setOpen] = useState({});
  const [drafts, setDrafts] = useState({});
  const [grading, setGrading] = useState({});
  const [results, setResults] = useState({});

  async function handleGrade(exercise) {
    const code = drafts[exercise.id] ?? starterCode();
    setGrading((state) => ({ ...state, [exercise.id]: true }));
    try {
      const result = await api.gradeExercise(exercise.id, code);
      setResults((state) => ({ ...state, [exercise.id]: result }));
    } catch (err) {
      setResults((state) => ({ ...state, [exercise.id]: { passed: false, feedback: err.message, actualOutput: "", expectedOutput: exercise.expectedOutput } }));
    } finally {
      setGrading((state) => ({ ...state, [exercise.id]: false }));
    }
  }

  if (loading) return <div className="page-loader">Loading exercises...</div>;
  if (error) return <EmptyState title="Exercises unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Practice system</span>
        <h1>Deliberate coding exercises</h1>
      </div>
      <div className="content-grid">
        {data?.map((exercise) => (
          <article className="resource-card" key={exercise.id}>
            <Badge tone="green">{exercise.difficulty}</Badge>
            <h2>{exercise.title}</h2>
            <p>{exercise.problemStatement}</p>
            <div className="tag-row">{exercise.tags?.slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <details>
              <summary>Hints</summary>
              <ul>{exercise.hints?.map((hint) => <li key={hint}>{hint}</li>)}</ul>
            </details>
            <div>
              <strong>Expected output:</strong>
              <pre className="output-box">{exercise.expectedOutput}</pre>
            </div>
            <label className="code-editor-label" htmlFor={`code-${exercise.id}`}>Your C# answer</label>
            <textarea
              id={`code-${exercise.id}`}
              className="code-editor"
              spellCheck="false"
              value={drafts[exercise.id] ?? starterCode()}
              onChange={(event) => setDrafts((state) => ({ ...state, [exercise.id]: event.target.value }))}
            />
            <div className="button-row">
              <button className="btn btn-primary" type="button" onClick={() => handleGrade(exercise)} disabled={grading[exercise.id]}>
                {grading[exercise.id] ? "Checking..." : "Run and grade"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setDrafts((state) => ({ ...state, [exercise.id]: exercise.solution }))}>
                Load solution
              </button>
            </div>
            {results[exercise.id] && (
              <div className={`grade-result ${results[exercise.id].passed ? "passed" : "failed"}`}>
                <strong>{results[exercise.id].passed ? "Passed" : "Needs work"}</strong>
                <p>{results[exercise.id].feedback}</p>
                <div className="two-mini">
                  <div>
                    <span>Expected</span>
                    <pre className="output-box">{results[exercise.id].expectedOutput || exercise.expectedOutput}</pre>
                  </div>
                  <div>
                    <span>Actual</span>
                    <pre className="output-box">{results[exercise.id].actualOutput || results[exercise.id].run?.stdout || "No output yet."}</pre>
                  </div>
                </div>
                {results[exercise.id].run?.stderr && <pre className="output-box error-output">{results[exercise.id].run.stderr}</pre>}
              </div>
            )}
            <button className="btn btn-secondary" type="button" onClick={() => setOpen((x) => ({ ...x, [exercise.id]: !x[exercise.id] }))}>
              {open[exercise.id] ? "Hide solution" : "Show solution"}
            </button>
            {open[exercise.id] && <CodeBlock code={`${exercise.solution}\n\n// ${exercise.explanation}`} />}
          </article>
        ))}
      </div>
    </section>
  );
}

function starterCode() {
  return "// Print the required lines here.\nConsole.WriteLine(\"\");";
}
