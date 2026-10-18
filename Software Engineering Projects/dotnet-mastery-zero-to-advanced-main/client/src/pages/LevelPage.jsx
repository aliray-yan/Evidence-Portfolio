import { ArrowRight, Award, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function LevelPage() {
  const { levelId } = useParams();
  const { data, error, loading } = useAsync(() => api.level(levelId), [levelId]);

  if (loading) return <div className="page-loader">Loading level...</div>;
  if (error || !data) return <EmptyState title="Level unavailable" body={error || "Level not found"} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Level {data.order}</span>
        <h1>{data.title}</h1>
        <p>{data.description}</p>
      </div>

      <div className="toolbar-row">
        <Badge tone="blue">{data.difficulty}</Badge>
        <span><Clock size={16} /> {data.estimatedHours} hours</span>
        {data.order > 0 && data.order % 5 === 0 && (
          <Link className="btn btn-secondary" to={`/quiz/final/${data.id}`}>
            <Award size={17} /> Final exam
          </Link>
        )}
      </div>

      <div className="module-grid">
        {data.modules?.map((module) => (
          <Link className="module-card" to={`/modules/${module.id}`} key={module.id}>
            <span className="module-order">{module.order}</span>
            <div>
              <Badge>{module.difficulty}</Badge>
              <h2>{module.title}</h2>
              <p>{module.description}</p>
              <span>{module.lessonCount} lessons</span>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
