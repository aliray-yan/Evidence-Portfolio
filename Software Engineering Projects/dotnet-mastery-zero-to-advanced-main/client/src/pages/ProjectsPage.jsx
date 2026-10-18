import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import CodeBlock from "../components/CodeBlock.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function ProjectsPage() {
  const [params] = useSearchParams();
  const moduleId = params.get("moduleId");
  const { data, error, loading } = useAsync(() => api.projects(moduleId), [moduleId]);
  const [open, setOpen] = useState({});
  const [progress, setProgress] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
      if (!data?.length) return;
      const entries = await Promise.all(data.map(async (project) => [project.id, await api.projectProgress(project.id)]));
      if (!cancelled) setProgress(Object.fromEntries(entries));
    }
    loadProgress().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data]);

  async function toggleStep(project, stepIndex) {
    const current = progress[project.id]?.completedSteps || [];
    const next = current.includes(stepIndex) ? current.filter((x) => x !== stepIndex) : [...current, stepIndex];
    const saved = await api.saveProjectProgress(project.id, next);
    setProgress((state) => ({ ...state, [project.id]: saved }));
  }

  if (loading) return <div className="page-loader">Loading projects...</div>;
  if (error) return <EmptyState title="Projects unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Guided projects</span>
        <h1>Build real .NET portfolio work</h1>
      </div>
      <div className="content-grid">
        {data?.map((project) => (
          <article className="resource-card wide" key={project.id}>
            {(() => {
              const completedSteps = progress[project.id]?.completedSteps || [];
              const totalSteps = project.steps?.length || 0;
              const percent = totalSteps ? Math.round((completedSteps.length * 100) / totalSteps) : 0;
              return <ProgressBar value={percent} label={`${completedSteps.length}/${totalSteps} checkpoints complete`} />;
            })()}
            <Badge tone="blue">{project.difficulty}</Badge>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
            <div className="two-mini">
              <div><h3>Requirements</h3><ul>{project.requirements?.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div>
                <h3>Build guide</h3>
                <div className="checklist">
                  {project.steps?.map((step, index) => (
                    <label key={step} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={Boolean(progress[project.id]?.completedSteps?.includes(index))}
                        onChange={() => toggleStep(project, index)}
                      />
                      <span>{step}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p><strong>Expected result:</strong> {project.expectedResult}</p>
            <button className="btn btn-secondary" type="button" onClick={() => setOpen((x) => ({ ...x, [project.id]: !x[project.id] }))}>
              {open[project.id] ? "Hide code" : "Show starter and final code"}
            </button>
            {open[project.id] && (
              <div className="two-mini code-mini">
                <CodeBlock code={project.starterCode} />
                <CodeBlock code={project.finalCode} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
