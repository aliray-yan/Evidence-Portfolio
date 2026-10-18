import { ArrowRight, Flame, GraduationCap, ListChecks, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { percent, shortDate } from "../utils/format.js";

export default function DashboardPage() {
  const { data, error, loading } = useAsync(() => api.dashboard(), []);

  if (loading) return <div className="page-loader">Loading dashboard...</div>;
  if (error) return <EmptyState title="Dashboard unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Student dashboard</span>
        <h1>Your .NET command center</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><GraduationCap /><span>Completed lessons</span><strong>{data.completedLessons}/{data.totalLessons}</strong></div>
        <div className="stat-card"><ListChecks /><span>Completion</span><strong>{data.completionPercent}%</strong></div>
        <div className="stat-card"><Flame /><span>Daily streak</span><strong>{data.streak} days</strong></div>
        <div className="stat-card"><Trophy /><span>Recent attempts</span><strong>{data.recentQuizAttempts?.length || 0}</strong></div>
      </div>

      <div className="two-column">
        <div className="panel">
          <div className="panel-header">
            <h2>Learning path progress</h2>
            <Link to="/learning-path">Open path <ArrowRight size={16} /></Link>
          </div>
          <div className="level-progress-list">
            {data.levelProgress?.slice(0, 10).map((level) => (
              <Link to={`/levels/${level.id}`} className="level-progress-item" key={level.id}>
                <div>
                  <Badge tone={level.difficulty?.includes("Beginner") ? "green" : "blue"}>{level.difficulty}</Badge>
                  <strong>{level.title}</strong>
                </div>
                <ProgressBar value={percent(level.completedLessons, level.totalLessons)} />
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Recent completions</h2>
          </div>
          {data.recentLessons?.length ? (
            <div className="activity-list">
              {data.recentLessons.map((item) => (
                <Link to={`/lessons/${item.lessonSlug}`} key={`${item.lessonId}-${item.completedAt}`}>
                  <strong>{item.lessonTitle}</strong>
                  <span>{item.moduleTitle} · {shortDate(item.completedAt)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No completed lessons yet" body="Open the learning path and complete your first lesson." />
          )}
        </div>
      </div>
    </section>
  );
}
