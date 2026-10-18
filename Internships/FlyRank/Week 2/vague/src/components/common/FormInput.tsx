import './FormInput.css'

interface FormInputProps {
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}

const FormInput = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  rows
}: FormInputProps) => {
  return (
    <div className="form-input-group">
      <label className="label-text">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className="input-field textarea"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows || 3}
        />
      ) : (
        <input
          type={type}
          className="input-field"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

export default FormInput
