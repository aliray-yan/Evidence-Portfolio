import { ArrowRight, ClipboardList, HelpCircle, TerminalSquare } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function ModulePage() {
  const { moduleId } = useParams();
  const { data, error, loading } = useAsync(() => api.module(moduleId), [moduleId]);

  if (loading) return <div className="page-loader">Loading module...</div>;
  if (error || !data) return <EmptyState title="Module unavailable" body={error || "Module not found"} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">{data.levelTitle}</span>
        <h1>{data.title}</h1>
        <p>{data.description}</p>
      </div>

      <div className="toolbar-row">
        <Link className="btn btn-secondary" to={`/quiz/module/${data.id}`}><HelpCircle size={17} /> Module quiz</Link>
        <Link className="btn btn-secondary" to={`/exercises?moduleId=${data.id}`}><ClipboardList size={17} /> Exercises</Link>
        <Link className="btn btn-secondary" to={`/projects?moduleId=${data.id}`}><TerminalSquare size={17} /> Projects</Link>
      </div>

      <div className="lesson-list">
        {data.lessons?.map((lesson, index) => (
          <Link className="lesson-row" to={`/lessons/${lesson.slug}`} key={lesson.id}>
            <span className="lesson-number">{index + 1}</span>
            <div>
              <h2>{lesson.title}</h2>
              <div className="tag-row">
                <Badge>{lesson.difficulty}</Badge>
                <span>{lesson.estimatedMinutes} min</span>
                {lesson.tags?.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
