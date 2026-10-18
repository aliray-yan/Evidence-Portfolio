import { Award, BookMarked, Brain, CheckCircle2, Code2, Flame, NotebookTabs, Target } from "lucide-react";
import { Link } from "react-router-dom";
import SkillTree from "../components/SkillTree.jsx";
import StatCard from "../components/StatCard.jsx";
import { codeLabs, getCodeLabProgress } from "../data/codeLabs.js";
import { useApiResource } from "../hooks/useApiResource.js";

export default function DashboardPage() {
  const { data, loading, error } = useApiResource("/progress/dashboard", []);

  if (loading) return <div className="center-panel">Loading dashboard...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const { stats, user, attempts, bookmarks, achievements, recentLessons, skillTree, ragLogs } = data;
  const codeLabProgress = getCodeLabProgress();
  const completedCodeLabs = codeLabs.filter((lab) => codeLabProgress[lab.id]?.passed).length;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Student dashboard</span>
          <h1>Welcome, {user.name}</h1>
          <p>Track lessons, quizzes, notes, bookmarks, achievements, streaks, and RAG playground activity.</p>
        </div>
        <Link className="primary-button" to="/learning-path">
          Continue Learning
        </Link>
      </section>

      <section className="stat-grid">
        <StatCard label="Course progress" value={`${stats.percentComplete}%`} helper={`${stats.completedLessons}/${stats.totalLessons} lessons`} icon={Target} />
        <StatCard label="Average quiz" value={`${stats.averageQuiz}%`} helper="Latest attempts" icon={CheckCircle2} />
        <StatCard label="Daily streak" value={`${user.streakCount || 0}`} helper="Learning days" icon={Flame} />
        <StatCard label="Achievements" value={stats.achievements} helper="Unlocked badges" icon={Award} />
        <StatCard label="Bookmarks" value={stats.bookmarks} helper="Saved lessons" icon={BookMarked} />
        <StatCard label="Notes" value={stats.notes} helper="Lesson notes" icon={NotebookTabs} />
        <StatCard label="Code labs" value={`${completedCodeLabs}/${codeLabs.length}`} helper="Validated coding tasks" icon={Code2} />
      </section>

      <section className="two-column">
        <div className="surface">
          <div className="section-title">
            <h2>Skill Tree</h2>
            <span>Level progress</span>
          </div>
          <SkillTree levels={skillTree} />
        </div>

        <div className="surface">
          <div className="section-title">
            <h2>Recent Lessons</h2>
            <span>Keep momentum</span>
          </div>
          <div className="compact-list">
            {recentLessons.map((item) => (
              <Link to={`/lessons/${item.lesson.slug}`} key={item.id}>
                <strong>{item.lesson.title}</strong>
                <span>{item.lesson.module.level.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="three-column">
        <div className="surface">
          <div className="section-title">
            <h2>Quiz Attempts</h2>
          </div>
          <div className="compact-list">
            {attempts.map((attempt) => (
              <Link to={attempt.lesson ? `/lessons/${attempt.lesson.slug}` : "/learning-path"} key={attempt.id}>
                <strong>{attempt.lesson?.title || "Final exam"}</strong>
                <span>
                  {attempt.score}/{attempt.total}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="surface">
          <div className="section-title">
            <h2>Bookmarks</h2>
          </div>
          <div className="compact-list">
            {bookmarks.map((bookmark) => (
              <Link to={`/lessons/${bookmark.lesson.slug}`} key={bookmark.id}>
                <strong>{bookmark.lesson.title}</strong>
                <span>{bookmark.lesson.summary}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="surface">
          <div className="section-title">
            <h2>RAG Activity</h2>
            <Brain size={18} />
          </div>
          <div className="compact-list">
            {ragLogs.length ? (
              ragLogs.map((log) => (
                <div key={log.id}>
                  <strong>{log.question}</strong>
                  <span>{Math.round(log.confidence * 100)}% confidence</span>
                </div>
              ))
            ) : (
              <Link to="/playground">Upload a text file in the playground</Link>
            )}
          </div>
        </div>
        <div className="surface">
          <div className="section-title">
            <h2>Must-Code Track</h2>
            <Code2 size={18} />
          </div>
          <div className="compact-list">
            <Link to="/code-labs">
              <strong>{completedCodeLabs}/{codeLabs.length} labs passed</strong>
              <span>Write and validate code for chunking, retrieval, prompts, citations, and safety.</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="surface">
        <div className="section-title">
          <h2>Achievements</h2>
          <span>{achievements.length} unlocked</span>
        </div>
        <div className="achievement-grid">
          {achievements.map((item) => (
            <div className="achievement-card" key={item.id}>
              <strong>{item.achievement.title}</strong>
              <span>{item.achievement.description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
