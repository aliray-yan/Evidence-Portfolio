import './ErrorState.css';

function ErrorState({ message }) {
  if (!message) return null;

  return (
    <div className="error-state" role="alert">
      <span className="error-state__icon" aria-hidden="true">
        ⚠️
      </span>
      <p className="error-state__message">{message}</p>
    </div>
  );
}

export default ErrorState;
