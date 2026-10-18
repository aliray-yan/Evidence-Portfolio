interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function SliderField({ id, label, value, onChange, min = 0, max = 100 }: SliderFieldProps) {
  return (
    <div className="field-group">
      <div className="field-group__header">
        <label htmlFor={id}>{label}</label>
        <span>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default SliderField;
