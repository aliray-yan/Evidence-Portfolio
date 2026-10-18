import { useState } from 'react'
import { Download, Trash2, Database } from 'lucide-react'
import SettingGroup from '../common/SettingGroup'
import ToggleSwitch from '../common/ToggleSwitch'
import './DataSettings.css'

interface DataSettingsProps {
  onSettingsChange: () => void
}

const DataSettings = ({ onSettingsChange }: DataSettingsProps) => {
  const [dataCollection, setDataCollection] = useState(true)
  const [analytics, setAnalytics] = useState(true)
  const [thirdPartySharing, setThirdPartySharing] = useState(false)
  const [retention, setRetention] = useState('90')

  const handleToggle = (setter: (value: boolean) => void) => {
    return (checked: boolean) => {
      setter(checked)
      onSettingsChange()
    }
  }

  return (
    <div className="data-settings">
      <h2>Data & Privacy</h2>

      {/* Data Collection */}
      <SettingGroup
        title="Data Collection"
        description="Manage how your data is collected"
      >
        <div className="collection-items">
          <div className="collection-item">
            <div className="item-content">
              <h4>Enable Data Collection</h4>
              <p>Allow us to collect usage data to improve the service</p>
            </div>
            <ToggleSwitch
              checked={dataCollection}
              onChange={handleToggle(setDataCollection)}
            />
          </div>
          <div className="collection-item">
            <div className="item-content">
              <h4>Analytics</h4>
              <p>Help us understand how you use our service</p>
            </div>
            <ToggleSwitch
              checked={analytics}
              onChange={handleToggle(setAnalytics)}
            />
          </div>
        </div>

        {dataCollection && (
          <div className="data-collected-info">
            <h5>Data We Collect:</h5>
            <ul>
              <li>Usage patterns and feature interactions</li>
              <li>Device information and system specifications</li>
              <li>Error logs and performance metrics</li>
              <li>Anonymized session information</li>
              <li>User preferences and settings</li>
            </ul>
          </div>
        )}
      </SettingGroup>

      {/* Data Sharing */}
      <SettingGroup
        title="Data Sharing & Third Parties"
        description="Control how your data is shared"
      >
        <div className="sharing-item">
          <div className="item-content">
            <h4>Third-Party Sharing</h4>
            <p>Share data with partners to improve services</p>
          </div>
          <ToggleSwitch
            checked={thirdPartySharing}
            onChange={handleToggle(setThirdPartySharing)}
          />
        </div>

        {thirdPartySharing && (
          <div className="partner-list">
            <h5>Our Partners:</h5>
            <div className="partners">
              <div className="partner-item">
                <span>Analytics Provider</span>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked onChange={() => onSettingsChange()} />
                </label>
              </div>
              <div className="partner-item">
                <span>Cloud Infrastructure</span>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked onChange={() => onSettingsChange()} />
                </label>
              </div>
              <div className="partner-item">
                <span>Security Monitoring</span>
                <label className="checkbox-label">
                  <input type="checkbox" onChange={() => onSettingsChange()} />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="consent-agreement">
          <p>
            We comply with GDPR, CCPA, and other privacy regulations. Your data is encrypted and secure.
          </p>
        </div>
      </SettingGroup>

      {/* Data Retention */}
      <SettingGroup
        title="Data Retention Policy"
        description="Automatic data deletion settings"
      >
        <div className="retention-setting">
          <label className="label-text">Automatically delete data older than:</label>
          <select
            className="select-input"
            value={retention}
            onChange={(e) => {
              setRetention(e.target.value)
              onSettingsChange()
            }}
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">6 months</option>
            <option value="365">1 year</option>
            <option value="never">Never</option>
          </select>
          <p className="help-text">
            This applies to logs, cache, and temporary data. Your trained models and important data won't be deleted.
          </p>
        </div>
      </SettingGroup>

      {/* Data Export */}
      <SettingGroup
        title="Data Export"
        description="Download your data in standard formats"
      >
        <div className="export-options">
          <button className="export-btn">
            <Download size={18} />
            <div>
              <span className="export-label">Export as JSON</span>
              <span className="export-desc">Your account data and settings</span>
            </div>
          </button>
          <button className="export-btn">
            <Database size={18} />
            <div>
              <span className="export-label">Export Training Data</span>
              <span className="export-desc">All datasets and models</span>
            </div>
          </button>
          <button className="export-btn">
            <Download size={18} />
            <div>
              <span className="export-label">Export Analytics Report</span>
              <span className="export-desc">Usage statistics and metrics</span>
            </div>
          </button>
        </div>
      </SettingGroup>

      {/* Data Deletion */}
      <SettingGroup
        title="Data Deletion"
        description="Permanently delete your data"
        isDanger
      >
        <div className="deletion-warning">
          <p>
            <strong>Warning:</strong> These actions are irreversible. Please make sure you have exported any important data first.
          </p>
        </div>

        <div className="deletion-options">
          <button className="btn-delete-secondary">
            <Trash2 size={18} />
            Clear Cache & Logs
          </button>
          <button className="btn-delete">
            <Trash2 size={18} />
            Delete All Data
          </button>
        </div>
      </SettingGroup>

      {/* Privacy Policy */}
      <SettingGroup
        title="Privacy Information"
        description="Learn more about how we protect your data"
      >
        <div className="privacy-info">
          <div className="info-box">
            <h5>Encryption</h5>
            <p>All data is encrypted with AES-256 at rest and TLS in transit</p>
          </div>
          <div className="info-box">
            <h5>GDPR Compliance</h5>
            <p>We comply with all GDPR requirements and provide data subject rights</p>
          </div>
          <div className="info-box">
            <h5>Data Centers</h5>
            <p>Your data is stored in EU data centers with strict compliance standards</p>
          </div>
          <div className="info-box">
            <h5>Regular Audits</h5>
            <p>We undergo regular security audits and penetration testing</p>
          </div>
        </div>

        <div className="privacy-links">
          <a href="#privacy-policy">Privacy Policy</a>
          <a href="#data-processing">Data Processing Agreement</a>
          <a href="#security-practices">Security Practices</a>
          <a href="#cookies">Cookie Policy</a>
        </div>
      </SettingGroup>
    </div>
  )
}

export default DataSettings
