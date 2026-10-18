import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { shortDate } from "../utils/format.js";

export default function BookmarksPage() {
  const { data, error, loading } = useAsync(() => api.bookmarks(), []);
  if (loading) return <div className="page-loader">Loading bookmarks...</div>;
  if (error) return <EmptyState title="Bookmarks unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Saved lessons</span>
        <h1>Bookmarks</h1>
      </div>
      {data?.length ? (
        <div className="activity-list">
          {data.map((item) => (
            <Link key={item.id} to={`/lessons/${item.lessonSlug}`}>
              <strong>{item.lessonTitle}</strong>
              <span>{item.moduleTitle} · saved {shortDate(item.createdAt)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No bookmarks yet" body="Bookmark lessons from the lesson reader." />
      )}
    </section>
  );
}
