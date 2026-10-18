import './EmptyState.css';

function EmptyState({ icon = '🎬', title, message, children }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      {title ? <h3 className="empty-state__title">{title}</h3> : null}
      {message ? <p className="empty-state__message">{message}</p> : null}
      {children}
    </div>
  );
}

export default EmptyState;
