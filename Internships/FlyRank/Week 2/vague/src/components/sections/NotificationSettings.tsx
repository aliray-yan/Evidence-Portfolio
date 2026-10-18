import { useState } from 'react'
import SettingGroup from '../common/SettingGroup'
import ToggleSwitch from '../common/ToggleSwitch'
import './NotificationSettings.css'

interface NotificationSettingsProps {
  onSettingsChange: () => void
}

const NotificationSettings = ({ onSettingsChange }: NotificationSettingsProps) => {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [aiAlerts, setAiAlerts] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)
  const [performanceAlerts, setPerformanceAlerts] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [productUpdates, setProductUpdates] = useState(false)

  const handleToggle = (setter: (value: boolean) => void) => {
    return (checked: boolean) => {
      setter(checked)
      onSettingsChange()
    }
  }

  return (
    <div className="notification-settings">
      <h2>Notification Preferences</h2>

      {/* Communication Channels */}
      <SettingGroup
        title="Communication Channels"
        description="Choose how you want to receive notifications"
      >
        <div className="notification-channels">
          <div className="channel-item">
            <div className="channel-info">
              <h4>Email Notifications</h4>
              <p>Receive alerts via email</p>
            </div>
            <ToggleSwitch
              checked={emailNotifications}
              onChange={handleToggle(setEmailNotifications)}
            />
          </div>
          <div className="channel-item">
            <div className="channel-info">
              <h4>Push Notifications</h4>
              <p>Get instant browser alerts</p>
            </div>
            <ToggleSwitch
              checked={pushNotifications}
              onChange={handleToggle(setPushNotifications)}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Alert Types */}
      <SettingGroup
        title="Alert Types"
        description="Customize which alerts you want to receive"
      >
        <div className="alert-types">
          <div className="alert-item">
            <div className="alert-info">
              <h4>AI Model Updates</h4>
              <p>Notifications about model performance and updates</p>
            </div>
            <ToggleSwitch
              checked={aiAlerts}
              onChange={handleToggle(setAiAlerts)}
            />
          </div>
          <div className="alert-item">
            <div className="alert-info">
              <h4>Performance Alerts</h4>
              <p>Alerts when metrics fall below thresholds</p>
            </div>
            <ToggleSwitch
              checked={performanceAlerts}
              onChange={handleToggle(setPerformanceAlerts)}
            />
          </div>
          <div className="alert-item">
            <div className="alert-info">
              <h4>Security Alerts</h4>
              <p>Critical security notifications and updates</p>
            </div>
            <ToggleSwitch
              checked={securityAlerts}
              onChange={handleToggle(setSecurityAlerts)}
            />
          </div>
          <div className="alert-item">
            <div className="alert-info">
              <h4>Daily Digest</h4>
              <p>Receive a summary of your AI activities</p>
            </div>
            <ToggleSwitch
              checked={dailyDigest}
              onChange={handleToggle(setDailyDigest)}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Frequency */}
      <SettingGroup
        title="Notification Frequency"
        description="Control how often you receive notifications"
      >
        <div className="frequency-options">
          <div className="frequency-item">
            <label className="label-text">Email Frequency</label>
            <select className="select-input" onChange={() => onSettingsChange()}>
              <option>Immediate</option>
              <option>Hourly</option>
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </div>
          <div className="frequency-item">
            <label className="label-text">Quiet Hours</label>
            <div className="quiet-hours">
              <input
                type="time"
                defaultValue="22:00"
                className="time-input"
                onChange={() => onSettingsChange()}
              />
              <span className="quiet-hours-to">to</span>
              <input
                type="time"
                defaultValue="08:00"
                className="time-input"
                onChange={() => onSettingsChange()}
              />
            </div>
            <p className="help-text">No notifications will be sent during these hours</p>
          </div>
        </div>
      </SettingGroup>

      {/* Product & Marketing */}
      <SettingGroup
        title="Product & Marketing"
        description="Manage promotional and product update emails"
      >
        <div className="product-items">
          <div className="product-item">
            <div className="product-info">
              <h4>Product Updates</h4>
              <p>Learn about new features and improvements</p>
            </div>
            <ToggleSwitch
              checked={productUpdates}
              onChange={handleToggle(setProductUpdates)}
            />
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

export default NotificationSettings
