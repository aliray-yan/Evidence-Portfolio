export default function ProgressBar({ value = 0, label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-wrap" aria-label={label || `Progress ${safeValue}%`}>
      <div className="progress-row">
        {label && <span>{label}</span>}
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
