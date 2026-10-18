import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { percent } from "../utils/format.js";

export default function LearningPathPage() {
  const levels = useAsync(() => api.levels(), []);
  const dashboard = useAsync(() => api.dashboard(), []);

  if (levels.loading) return <div className="page-loader">Loading learning path...</div>;
  if (levels.error) return <EmptyState title="Learning path unavailable" body={levels.error} />;

  const progressById = new Map((dashboard.data?.levelProgress || []).map((item) => [item.id, item]));

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Curriculum architecture</span>
        <h1>Zero to advanced .NET path</h1>
      </div>
      <div className="path-grid">
        {levels.data?.map((level) => {
          const progress = progressById.get(level.id);
          return (
            <Link className="path-card" to={`/levels/${level.id}`} key={level.id}>
              <div className="path-index">{String(level.order).padStart(2, "0")}</div>
              <div className="path-body">
                <Badge tone={level.difficulty?.includes("Beginner") ? "green" : "blue"}>{level.difficulty}</Badge>
                <h2>{level.title}</h2>
                <p>{level.description}</p>
                <div className="meta-row">
                  <span><Clock size={15} /> {level.estimatedHours}h</span>
                  <span>{level.moduleCount} modules</span>
                  <span>{level.lessonCount} lessons</span>
                </div>
                <ProgressBar value={percent(progress?.completedLessons || 0, progress?.totalLessons || level.lessonCount)} />
              </div>
              <ArrowRight size={20} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
