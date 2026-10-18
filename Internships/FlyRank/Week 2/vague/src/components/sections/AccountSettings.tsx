import { useState } from 'react'
import { Edit2, Upload } from 'lucide-react'
import SettingGroup from '../common/SettingGroup'
import FormInput from '../common/FormInput'
import './AccountSettings.css'

interface AccountSettingsProps {
  onSettingsChange: () => void
  onThemeToggle: (isDark: boolean) => void
}

const AccountSettings = ({ onSettingsChange }: AccountSettingsProps) => {
  const [email, setEmail] = useState('user@example.com')
  const [fullName, setFullName] = useState('John Doe')
  const [organization, setOrganization] = useState('Acme Corporation')
  const [bio, setBio] = useState('AI enthusiast and data scientist')
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/100')

  const handleInputChange = (setter: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value)
      onSettingsChange()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string)
        onSettingsChange()
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="account-settings">
      <h2>Account Settings</h2>

      {/* Profile Section */}
      <SettingGroup title="Profile Information" description="Manage your profile details">
        <div className="profile-section">
          <div className="profile-image-container">
            <img src={profileImage} alt="Profile" className="profile-image" />
            <label className="upload-badge" title="Upload profile picture">
              <Upload size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="profile-form">
            <FormInput
              label="Full Name"
              value={fullName}
              onChange={handleInputChange(setFullName)}
              placeholder="Enter your full name"
            />
            <FormInput
              label="Email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              placeholder="Enter your email"
            />
            <FormInput
              label="Organization"
              value={organization}
              onChange={handleInputChange(setOrganization)}
              placeholder="Enter your organization"
            />
            <FormInput
              label="Bio"
              type="textarea"
              value={bio}
              onChange={handleInputChange(setBio)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Theme Section */}
      <SettingGroup
        title="Appearance"
        description="Customize how the dashboard looks"
      >
        <div className="theme-options">
          <label className="theme-option">
            <input type="radio" name="theme" value="light" defaultChecked onChange={() => onSettingsChange()} />
            <span>Light Mode</span>
          </label>
          <label className="theme-option">
            <input type="radio" name="theme" value="dark" onChange={() => onSettingsChange()} />
            <span>Dark Mode</span>
          </label>
          <label className="theme-option">
            <input type="radio" name="theme" value="auto" onChange={() => onSettingsChange()} />
            <span>Auto (System)</span>
          </label>
        </div>
      </SettingGroup>

      {/* Language Section */}
      <SettingGroup
        title="Language & Region"
        description="Set your preferred language and timezone"
      >
        <div className="language-section">
          <div className="language-row">
            <div>
              <label className="label-text">Language</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Chinese</option>
              </select>
            </div>
            <div>
              <label className="label-text">Timezone</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>UTC</option>
                <option>EST (UTC-5)</option>
                <option>CST (UTC-6)</option>
                <option>MST (UTC-7)</option>
                <option>PST (UTC-8)</option>
              </select>
            </div>
          </div>
        </div>
      </SettingGroup>

      {/* Danger Zone */}
      <SettingGroup
        title="Danger Zone"
        description="Irreversible account actions"
        isDanger
      >
        <div className="danger-actions">
          <button className="btn-danger-secondary">Download Account Data</button>
          <button className="btn-danger">Delete Account</button>
        </div>
      </SettingGroup>
    </div>
  )
}

export default AccountSettings
