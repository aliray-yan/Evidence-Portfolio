interface ToggleFieldProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleField({ id, label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="toggle-field">
      <div>
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? 'toggle--active' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}

export default ToggleField;
