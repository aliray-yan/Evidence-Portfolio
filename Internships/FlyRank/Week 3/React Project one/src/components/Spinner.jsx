import './Spinner.css';

function Spinner({ label = 'Loading…', size = 'md' }) {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-live="polite">
      <span className="spinner__ring" aria-hidden="true" />
      {label ? <span className="spinner__label">{label}</span> : null}
    </div>
  );
}

export default Spinner;
