import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { shortDate } from "../utils/format.js";

export default function AchievementsPage() {
  const all = useAsync(() => api.achievements(), []);
  const mine = useAsync(() => api.myAchievements(), []);

  if (all.loading || mine.loading) return <div className="page-loader">Loading badges...</div>;
  if (all.error) return <EmptyState title="Achievements unavailable" body={all.error} />;

  const unlocked = new Map((mine.data || []).map((item) => [item.achievement?.id, item]));

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Achievements and badges</span>
        <h1>Professional learning milestones</h1>
      </div>
      <div className="badge-grid">
        {all.data?.map((achievement) => {
          const hit = unlocked.get(achievement.id);
          return (
            <article className={hit ? "achievement unlocked" : "achievement"} key={achievement.id}>
              <span className="achievement-icon">{achievement.icon}</span>
              <h2>{achievement.title}</h2>
              <p>{achievement.description}</p>
              <small>{hit ? `Unlocked ${shortDate(hit.unlockedAt)}` : achievement.condition}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
