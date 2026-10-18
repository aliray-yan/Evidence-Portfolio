import { Search } from "lucide-react";
import { useState } from "react";
import LessonCard from "../components/LessonCard.jsx";
import { api } from "../services/api.js";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (q.trim().length < 2) return;
    try {
      const data = await api.get(`/content/search?q=${encodeURIComponent(q.trim())}`);
      setLessons(data.lessons);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Search lessons</span>
          <h1>Find RAG concepts fast</h1>
        </div>
      </section>
      <form className="search-box" onSubmit={submit}>
        <Search size={20} />
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search embeddings, chunking, hallucination..." />
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>
      {error && <div className="form-error">{error}</div>}
      <section className="lesson-grid">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </section>
    </div>
  );
}
