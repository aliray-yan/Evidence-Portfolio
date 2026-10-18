import { BookOpen, Database, FileQuestion, GraduationCap, Library, Users } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard.jsx";
import { useApiResource } from "../hooks/useApiResource.js";

export default function AdminDashboardPage() {
  const { data, loading, error } = useApiResource("/admin/stats", []);
  if (loading) return <div className="center-panel">Loading admin dashboard...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const { stats } = data;
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Admin dashboard</span>
          <h1>Platform stats</h1>
          <p>Manage curriculum content, quizzes, exercises, projects, references, and monitor RAG demo usage.</p>
        </div>
        <Link className="primary-button" to="/admin/content">
          Manage Content
        </Link>
      </section>
      <section className="stat-grid">
        <StatCard label="Users" value={stats.users} icon={Users} />
        <StatCard label="Levels" value={stats.levels} icon={GraduationCap} />
        <StatCard label="Lessons" value={stats.lessons} icon={BookOpen} />
        <StatCard label="Quiz questions" value={stats.questions} icon={FileQuestion} />
        <StatCard label="Tools" value={stats.tools} icon={Library} />
        <StatCard label="RAG documents" value={stats.documents} icon={Database} />
      </section>
      <section className="surface">
        <h2>Content inventory</h2>
        <div className="admin-inventory">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
