import { Bookmark, BookmarkCheck, CheckCircle2, Clock, Compass, NotebookPen, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import QuizRunner from "../components/QuizRunner.jsx";
import { api } from "../services/api.js";
import { useApiResource } from "../hooks/useApiResource.js";

function Section({ title, children }) {
  return (
    <section className="lesson-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function RichText({ text }) {
  return (
    <div className="rich-text">
      {String(text || "")
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
    </div>
  );
}

export default function LessonPage() {
  const { slug } = useParams();
  const { data, setData, loading, error } = useApiResource(`/content/lessons/${slug}`, [slug]);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="center-panel">Loading lesson...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const { lesson, userState } = data;
  const noteContent = userState?.note?.content || "";

  async function completeLesson() {
    setSaving(true);
    try {
      const result = await api.post(`/progress/lessons/${lesson.id}/complete`, {});
      setData((current) => ({
        ...current,
        userState: { ...current.userState, progress: result.progress }
      }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBookmark() {
    if (userState?.bookmarked) {
      await api.delete(`/progress/bookmarks/${lesson.id}`);
    } else {
      await api.post(`/progress/bookmarks/${lesson.id}`, {});
    }
    setData((current) => ({
      ...current,
      userState: { ...current.userState, bookmarked: !current.userState?.bookmarked }
    }));
  }

  async function saveNote(content) {
    const result = await api.post(`/progress/notes/${lesson.id}`, { content });
    setData((current) => ({
      ...current,
      userState: { ...current.userState, note: result.note }
    }));
  }

  return (
    <div className="lesson-reader">
      <section className="lesson-hero">
        <div>
          <Link to={`/levels/${lesson.module.level.number}`} className="breadcrumb">
            {lesson.module.level.title} / {lesson.module.title}
          </Link>
          <h1>{lesson.title}</h1>
          <div className="meta-row">
            <span>{lesson.difficulty}</span>
            <span>
              <Clock size={14} /> {lesson.estimatedMinutes} minutes
            </span>
          </div>
        </div>
        <div className="lesson-actions">
          <button className="secondary-button" type="button" onClick={toggleBookmark}>
            {userState?.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            Bookmark
          </button>
          <button className="primary-button" type="button" onClick={completeLesson} disabled={saving}>
            <CheckCircle2 size={18} />
            {userState?.progress?.status === "COMPLETED" ? "Completed" : "Mark Complete"}
          </button>
        </div>
      </section>

      <div className="lesson-layout">
        <article className="lesson-content">
          <section className="lesson-focus-grid">
            <div>
              <Compass size={18} />
              <strong>Understand</strong>
              <span>Explain {lesson.title} in plain English.</span>
            </div>
            <div>
              <Wrench size={18} />
              <strong>Apply</strong>
              <span>Connect it to retrieval, prompting, evaluation, or safety.</span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <strong>Debug</strong>
              <span>Name the failure mode this concept helps you inspect.</span>
            </div>
          </section>
          <Section title="Simple explanation">
            <RichText text={lesson.simpleExplanation} />
          </Section>
          <Section title="Explain like I am 10">
            <RichText text={lesson.eli10} />
          </Section>
          <Section title="Real-life analogy">
            <RichText text={lesson.analogy} />
          </Section>
          <Section title="Why it matters">
            <RichText text={lesson.whyMatters} />
          </Section>
          <Section title="Technical explanation">
            <RichText text={lesson.technicalExplanation} />
          </Section>
          {lesson.codeExample && (
            <Section title="Code example">
              <pre>
                <code>{lesson.codeExample}</code>
              </pre>
            </Section>
          )}
          <Section title="Visual explanation idea">
            <RichText text={lesson.visualIdea} />
          </Section>
          <Section title="Common mistakes">
            <ul>
              {lesson.commonMistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </Section>
          <Section title="Mini practice task">
            <RichText text={lesson.miniPractice} />
          </Section>
          <Section title="Summary">
            <RichText text={lesson.summary} />
          </Section>
          {lesson.nextLesson && (
            <Section title="Next lesson recommendation">
              <RichText text={lesson.nextLesson} />
            </Section>
          )}
          <div className="tag-row">
            {lesson.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </article>

        <aside className="lesson-sidebar">
          <div className="surface">
            <div className="section-title">
              <h2>Notes</h2>
              <NotebookPen size={18} />
            </div>
            <textarea
              defaultValue={noteContent}
              onBlur={(event) => saveNote(event.target.value)}
              placeholder="Write lesson notes..."
            />
          </div>
          <div className="surface">
            <div className="section-title">
              <h2>Quiz</h2>
              <span>{lesson.quizQuestions.length} questions</span>
            </div>
            <QuizRunner lessonId={lesson.id} questions={lesson.quizQuestions} />
          </div>
        </aside>
      </div>
    </div>
  );
}
