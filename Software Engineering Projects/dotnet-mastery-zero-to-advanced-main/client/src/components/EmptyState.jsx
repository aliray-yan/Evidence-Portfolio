export default function EmptyState({ title = "Nothing here yet", body = "Try another filter or come back after the API loads." }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
