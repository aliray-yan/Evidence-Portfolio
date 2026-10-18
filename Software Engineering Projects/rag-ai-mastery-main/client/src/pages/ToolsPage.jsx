import { ExternalLink } from "lucide-react";
import { useApiResource } from "../hooks/useApiResource.js";

export default function ToolsPage() {
  const { data, loading, error } = useApiResource("/content/tools", []);
  if (loading) return <div className="center-panel">Loading tool library...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Reference library</span>
          <h1>RAG tools and concepts</h1>
          <p>Vector databases, frameworks, local LLM runtimes, evaluation tools, backend technologies, and search concepts.</p>
        </div>
      </section>
      <section className="tool-grid">
        {data.tools.map((tool) => (
          <article className="tool-card" key={tool.id}>
            <div className="meta-row">
              <span>{tool.category}</span>
              <span>{tool.pricing}</span>
            </div>
            <h2>{tool.name}</h2>
            <p>{tool.description}</p>
            {tool.url && (
              <a href={tool.url} target="_blank" rel="noreferrer">
                Open reference <ExternalLink size={14} />
              </a>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
