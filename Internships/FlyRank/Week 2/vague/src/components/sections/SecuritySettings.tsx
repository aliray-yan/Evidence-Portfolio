import { useState } from 'react'
import { Lock, Key, Smartphone, AlertCircle } from 'lucide-react'
import SettingGroup from '../common/SettingGroup'
import ToggleSwitch from '../common/ToggleSwitch'
import './SecuritySettings.css'

interface SecuritySettingsProps {
  onSettingsChange: () => void
}

const SecuritySettings = ({ onSettingsChange }: SecuritySettingsProps) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [ipWhitelist, setIpWhitelist] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('30')
  const [loginAlerts, setLoginAlerts] = useState(true)

  const handleToggle = (setter: (value: boolean) => void) => {
    return (checked: boolean) => {
      setter(checked)
      onSettingsChange()
    }
  }

  return (
    <div className="security-settings">
      <h2>Security Settings</h2>

      {/* Two-Factor Authentication */}
      <SettingGroup
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
      >
        <div className="security-item">
          <div className="security-item-content">
            <h4>Enable Two-Factor Authentication</h4>
            <p>Require a verification code in addition to your password</p>
          </div>
          <ToggleSwitch
            checked={twoFactorEnabled}
            onChange={handleToggle(setTwoFactorEnabled)}
          />
        </div>
        {twoFactorEnabled && (
          <div className="setup-guide">
            <h5>Setup Instructions:</h5>
            <ol>
              <li>Download an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)</li>
              <li>Scan the QR code displayed above</li>
              <li>Enter the 6-digit code to confirm setup</li>
            </ol>
            <div className="backup-codes">
              <p><strong>Save these backup codes in a safe place:</strong></p>
              <div className="codes-list">
                <code>1234-5678-9012</code>
                <code>3456-7890-1234</code>
                <code>5678-9012-3456</code>
                <code>7890-1234-5678</code>
              </div>
            </div>
          </div>
        )}
      </SettingGroup>

      {/* Biometric Authentication */}
      <SettingGroup
        title="Biometric Authentication"
        description="Use fingerprint or face recognition to log in"
      >
        <div className="security-item">
          <div className="security-item-content">
            <h4>Enable Biometric Login</h4>
            <p>Use your fingerprint or face to access your account</p>
          </div>
          <ToggleSwitch
            checked={biometricEnabled}
            onChange={handleToggle(setBiometricEnabled)}
          />
        </div>
      </SettingGroup>

      {/* Session Management */}
      <SettingGroup
        title="Session Management"
        description="Control your login sessions"
      >
        <div className="session-settings">
          <div className="session-option">
            <label className="label-text">Session Timeout (minutes)</label>
            <select
              className="select-input"
              value={sessionTimeout}
              onChange={(e) => {
                setSessionTimeout(e.target.value)
                onSettingsChange()
              }}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">Never</option>
            </select>
            <p className="help-text">Automatically log out after this period of inactivity</p>
          </div>
        </div>

        <div className="active-sessions">
          <h4>Active Sessions</h4>
          <div className="session-list">
            <div className="session-item">
              <div className="session-device">
                <Smartphone size={20} />
                <div>
                  <span className="device-name">Chrome on Windows</span>
                  <span className="device-time">Last active: 5 minutes ago</span>
                </div>
              </div>
              <button className="btn-logout">Logout</button>
            </div>
            <div className="session-item">
              <div className="session-device">
                <Smartphone size={20} />
                <div>
                  <span className="device-name">Safari on iPhone</span>
                  <span className="device-time">Last active: 2 hours ago</span>
                </div>
              </div>
              <button className="btn-logout">Logout</button>
            </div>
          </div>
          <button className="btn-logout-all">Logout All Other Sessions</button>
        </div>
      </SettingGroup>

      {/* IP Whitelist */}
      <SettingGroup
        title="IP Whitelist"
        description="Only allow logins from specific IP addresses"
      >
        <div className="security-item">
          <div className="security-item-content">
            <h4>Enable IP Whitelist</h4>
            <p>Restrict access to whitelisted IP addresses</p>
          </div>
          <ToggleSwitch
            checked={ipWhitelist}
            onChange={handleToggle(setIpWhitelist)}
          />
        </div>
        {ipWhitelist && (
          <div className="ip-list">
            <div className="ip-item">
              <span>192.168.1.100</span>
              <button className="btn-small-danger">Remove</button>
            </div>
            <div className="ip-item">
              <span>203.0.113.45</span>
              <button className="btn-small-danger">Remove</button>
            </div>
            <input
              type="text"
              placeholder="Add new IP address"
              className="ip-input"
              onChange={() => onSettingsChange()}
            />
          </div>
        )}
      </SettingGroup>

      {/* Login Alerts */}
      <SettingGroup
        title="Login Alerts"
        description="Get notified of suspicious login attempts"
      >
        <div className="security-item">
          <div className="security-item-content">
            <h4>Enable Login Alerts</h4>
            <p>Receive alerts for new device logins</p>
          </div>
          <ToggleSwitch
            checked={loginAlerts}
            onChange={handleToggle(setLoginAlerts)}
          />
        </div>
      </SettingGroup>

      {/* Recent Activity */}
      <SettingGroup
        title="Recent Activity"
        description="View your recent login activity"
      >
        <div className="activity-list">
          <div className="activity-item success">
            <div className="activity-icon">✓</div>
            <div className="activity-details">
              <span className="activity-action">Successful login from Chrome</span>
              <span className="activity-time">Today at 2:30 PM - 192.168.1.100</span>
            </div>
          </div>
          <div className="activity-item warning">
            <div className="activity-icon"><AlertCircle size={18} /></div>
            <div className="activity-details">
              <span className="activity-action">Failed login attempt</span>
              <span className="activity-time">Yesterday at 11:45 PM - 198.51.100.50</span>
            </div>
          </div>
          <div className="activity-item success">
            <div className="activity-icon">✓</div>
            <div className="activity-details">
              <span className="activity-action">Successful login from Safari</span>
              <span className="activity-time">2 days ago at 3:15 PM - 203.0.113.45</span>
            </div>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

export default SecuritySettings
