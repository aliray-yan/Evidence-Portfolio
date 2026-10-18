import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function LessonCard({ lesson, status }) {
  const complete = status === "COMPLETED";
  return (
    <Link to={`/lessons/${lesson.slug}`} className={`lesson-card ${complete ? "complete" : ""}`}>
      <div className="lesson-card-icon">{complete ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}</div>
      <div>
        <h3>{lesson.title}</h3>
        <p>{lesson.summary}</p>
        <div className="meta-row">
          <span>{lesson.difficulty}</span>
          <span>
            <Clock size={14} /> {lesson.estimatedMinutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
