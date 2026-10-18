import { useState } from "react";
import { useApiResource } from "../hooks/useApiResource.js";

export default function ProjectsPage() {
  const { data, loading, error } = useApiResource("/content/projects", []);
  const [openProject, setOpenProject] = useState(null);

  if (loading) return <div className="center-panel">Loading projects...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Guided projects</span>
          <h1>Build portfolio-ready RAG apps</h1>
          <p>Each project includes goal, requirements, architecture, steps, starter code, final code, tests, and extensions.</p>
        </div>
      </section>
      <section className="project-list">
        {data.projects.map((project) => (
          <article className="project-card" key={project.id}>
            <button type="button" onClick={() => setOpenProject(openProject === project.id ? null : project.id)}>
              <span>
                <strong>{project.title}</strong>
                <small>{project.goal}</small>
              </span>
              <span>{openProject === project.id ? "Close" : "Open"}</span>
            </button>
            {openProject === project.id && (
              <div className="project-detail">
                <h3>Requirements</h3>
                <ul>
                  {project.requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h3>Architecture</h3>
                <p>{project.architecture}</p>
                <h3>Steps</h3>
                <ol>
                  {project.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <h3>Starter code</h3>
                <pre>
                  <code>{project.starterCode}</code>
                </pre>
                <h3>Final code</h3>
                <pre>
                  <code>{project.finalCode}</code>
                </pre>
                <h3>Testing</h3>
                <p>{project.testing}</p>
                <h3>Common mistakes</h3>
                <ul>
                  {project.commonMistakes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h3>Extension ideas</h3>
                <div className="tag-row">
                  {project.extensionIdeas.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
