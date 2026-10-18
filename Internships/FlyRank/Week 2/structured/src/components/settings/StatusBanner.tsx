interface StatusBannerProps {
  type: 'success' | 'error';
  message: string;
}

function StatusBanner({ type, message }: StatusBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`status-banner status-banner--${type}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default StatusBanner;
