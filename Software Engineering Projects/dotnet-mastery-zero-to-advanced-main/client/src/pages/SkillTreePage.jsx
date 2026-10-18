import { Link } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function SkillTreePage() {
  const { data, error, loading } = useAsync(() => api.levels(), []);
  if (loading) return <div className="page-loader">Growing skill tree...</div>;
  if (error) return <EmptyState title="Skill tree unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Skill tree</span>
        <h1>How the curriculum branches</h1>
      </div>
      <div className="skill-tree">
        {data?.map((level) => (
          <Link className="skill-node" to={`/levels/${level.id}`} key={level.id}>
            <span>{level.order}</span>
            <strong>{level.title.replace(/^LEVEL \d+:\s*/, "")}</strong>
            <Badge>{level.difficulty}</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
