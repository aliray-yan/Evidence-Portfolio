interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}

function SelectField({ id, label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectField;
