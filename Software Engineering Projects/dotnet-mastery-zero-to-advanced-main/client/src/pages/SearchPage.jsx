import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../services/api.js";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      setResults(await api.search(q, type));
    } catch (err) {
      setError(err.message);
    }
  }

  const groups = results ? [
    ["Lessons", results.lessons, (item) => `/lessons/${item.slug}`],
    ["Modules", results.modules, (item) => `/modules/${item.id}`],
    ["Projects", results.projects, () => "/projects"],
    ["Exercises", results.exercises, () => "/exercises"]
  ] : [];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Search system</span>
        <h1>Find lessons, projects, and practice</h1>
      </div>
      <form className="search-panel" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search C#, EF Core, JWT, Blazor..." />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All</option>
          <option value="lessons">Lessons</option>
          <option value="modules">Modules</option>
          <option value="projects">Projects</option>
          <option value="exercises">Exercises</option>
        </select>
        <button className="btn btn-primary" type="submit"><Search size={17} /> Search</button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {groups.map(([label, items, href]) => (
        <div className="panel" key={label}>
          <h2>{label}</h2>
          {items?.length ? (
            <div className="result-grid">
              {items.map((item) => (
                <Link className="result-card" to={href(item)} key={`${label}-${item.id}`}>
                  <Badge>{item.difficulty}</Badge>
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title={`No ${label.toLowerCase()}`} body="Try a broader term." />
          )}
        </div>
      ))}
    </section>
  );
}
