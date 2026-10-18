import { ClipboardList } from "lucide-react";
import { useParams } from "react-router-dom";
import LessonCard from "../components/LessonCard.jsx";
import { useApiResource } from "../hooks/useApiResource.js";

export default function LevelPage() {
  const { levelId } = useParams();
  const { data, loading, error } = useApiResource(`/content/levels/${levelId}`, [levelId]);

  if (loading) return <div className="center-panel">Loading level...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const { level } = data;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">{level.difficulty}</span>
          <h1>{level.title}</h1>
          <p>{level.description}</p>
        </div>
      </section>

      {level.modules.map((module) => (
        <section className="surface" key={module.id}>
          <div className="section-title">
            <div>
              <h2>{module.title}</h2>
              <span>{module.description}</span>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="lesson-grid">
            {module.lessons.map((lesson) => (
              <LessonCard lesson={lesson} key={lesson.id} />
            ))}
          </div>
          {module.exercises.length > 0 && (
            <div className="exercise-strip">
              {module.exercises.map((exercise) => (
                <span key={exercise.id}>{exercise.title}</span>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
