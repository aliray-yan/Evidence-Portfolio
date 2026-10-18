import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import { useApiResource } from "../hooks/useApiResource.js";

export default function LearningPathPage() {
  const { data, loading, error } = useApiResource("/content/levels", []);

  if (loading) return <div className="center-panel">Loading learning path...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const { levels, progressByLesson } = data;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Learning path</span>
          <h1>Zero to Advanced RAG</h1>
          <p>Start at AI basics and move toward production architecture, local models, security, and expert RAG topics.</p>
        </div>
      </section>

      <section className="level-grid">
        {levels.map((level) => {
          const lessonIds = level.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
          const completed = lessonIds.filter((id) => progressByLesson[id] === "COMPLETED").length;
          const percent = lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0;
          return (
            <Link className="level-card" to={`/levels/${level.number}`} key={level.id}>
              <div className="level-number">{level.number}</div>
              <div>
                <h2>{level.title}</h2>
                <p>{level.description}</p>
                <ProgressBar value={percent} label={`${completed}/${lessonIds.length} lessons`} />
                <div className="meta-row">
                  <span>{level.difficulty}</span>
                  <span>{level.modules.length} modules</span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
