import { Bookmark, CheckCircle2, HelpCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import CodeBlock from "../components/CodeBlock.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function LessonReaderPage() {
  const { slug } = useParams();
  const lessonState = useAsync(() => api.lesson(slug), [slug]);
  const lesson = lessonState.data;
  const [note, setNote] = useState("");
  const [completed, setCompleted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!lesson?.id) return;
    let active = true;
    Promise.all([
      api.note(lesson.id).catch(() => ({ content: "" })),
      api.lessonProgress(lesson.id).catch(() => ({ completed: false })),
      api.bookmarks().catch(() => [])
    ]).then(([noteResult, progressResult, bookmarkResult]) => {
      if (!active) return;
      setNote(noteResult.content || "");
      setCompleted(Boolean(progressResult.completed));
      setBookmarked(bookmarkResult.some((item) => item.lessonId === lesson.id));
    });
    return () => {
      active = false;
    };
  }, [lesson?.id]);

  async function markComplete() {
    await api.completeLesson({ lessonId: lesson.id, timeSpent: lesson.estimatedMinutes });
    setCompleted(true);
    setStatus("Lesson completed");
  }

  async function toggleBookmark() {
    const result = await api.toggleBookmark(lesson.id);
    setBookmarked(result.bookmarked);
  }

  async function saveNote() {
    await api.saveNote(lesson.id, note);
    setStatus("Note saved");
  }

  if (lessonState.loading) return <div className="page-loader">Opening lesson...</div>;
  if (lessonState.error || !lesson) return <EmptyState title="Lesson unavailable" body={lessonState.error || "Lesson not found"} />;

  return (
    <article className="lesson-layout">
      <aside className="lesson-aside">
        <Badge tone="blue">{lesson.difficulty}</Badge>
        <h2>{lesson.title}</h2>
        <ProgressBar value={completed ? 100 : 0} label="Lesson completion" />
        <button className="btn btn-primary" type="button" onClick={markComplete}>
          <CheckCircle2 size={17} /> Mark complete
        </button>
        <button className="btn btn-secondary" type="button" onClick={toggleBookmark}>
          <Bookmark size={17} /> {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <Link className="btn btn-secondary" to={`/quiz/lesson/${lesson.id}`}>
          <HelpCircle size={17} /> Take quiz
        </Link>
        {status && <div className="alert alert-success">{status}</div>}
      </aside>

      <div className="lesson-content">
        <div className="page-heading">
          <span className="eyebrow">{lesson.levelTitle} · {lesson.moduleTitle}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.estimatedMinutes} minutes · {lesson.tags?.map((tag) => `#${tag}`).join(" ")}</p>
        </div>

        <section><h2>Simple explanation</h2><p>{lesson.simpleExplanation}</p></section>
        <section><h2>Explain like I’m 10</h2><p>{lesson.eli10Explanation}</p></section>
        <section><h2>Real-life analogy</h2><p>{lesson.analogy}</p></section>
        <section><h2>Why it matters</h2><p>{lesson.whyItMatters}</p></section>
        <section><h2>Code example</h2><CodeBlock code={lesson.codeExample} /></section>
        <section>
          <h2>Line-by-line explanation</h2>
          <ul className="clean-list">
            {lesson.lineByLineExplanation?.split("\n").map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
        <section>
          <h2>Common mistakes</h2>
          <ul className="clean-list">
            {lesson.commonMistakes?.map((mistake) => <li key={mistake}>{mistake}</li>)}
          </ul>
        </section>
        <section><h2>Mini practice task</h2><p>{lesson.miniPracticeTask}</p></section>
        <section><h2>Summary</h2><p>{lesson.summary}</p></section>
        <section className="note-editor">
          <h2>Lesson notes</h2>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={7} placeholder="Write your own explanation, questions, or reminders." />
          <button className="btn btn-primary" type="button" onClick={saveNote}><Save size={17} /> Save note</button>
        </section>
        {lesson.nextLessonSlug && (
          <Link className="next-lesson" to={`/lessons/${lesson.nextLessonSlug}`}>
            Next lesson: <strong>{lesson.nextLessonTitle}</strong>
          </Link>
        )}
      </div>
    </article>
  );
}
