import { useState } from 'react'
import './ToggleSwitch.css'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false
}: ToggleSwitchProps) => {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="toggle-slider"></span>
    </label>
  )
}

export default ToggleSwitch
