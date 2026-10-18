export default function ProgressBar({ value = 0, label }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-wrap" aria-label={label}>
      <div className="progress-label">
        <span>{label}</span>
        <strong>{normalized}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
