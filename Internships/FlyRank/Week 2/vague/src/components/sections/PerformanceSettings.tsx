import { useState } from 'react'
import { Zap, Database, Activity, HardDrive } from 'lucide-react'
import SettingGroup from '../common/SettingGroup'
import ToggleSwitch from '../common/ToggleSwitch'
import './PerformanceSettings.css'

interface PerformanceSettingsProps {
  onSettingsChange: () => void
}

const PerformanceSettings = ({ onSettingsChange }: PerformanceSettingsProps) => {
  const [caching, setCaching] = useState(true)
  const [compression, setCompression] = useState(true)
  const [asyncLoading, setAsyncLoading] = useState(true)
  const [resourceLimit, setResourceLimit] = useState('80')

  const handleToggle = (setter: (value: boolean) => void) => {
    return (checked: boolean) => {
      setter(checked)
      onSettingsChange()
    }
  }

  return (
    <div className="performance-settings">
      <h2>Performance Settings</h2>

      {/* Optimization Features */}
      <SettingGroup
        title="Performance Optimization"
        description="Enable features to improve dashboard speed"
      >
        <div className="optimization-items">
          <div className="opt-item">
            <div className="opt-icon">
              <Database size={24} />
            </div>
            <div className="opt-info">
              <h4>Caching</h4>
              <p>Cache data locally to reduce API calls</p>
            </div>
            <ToggleSwitch
              checked={caching}
              onChange={handleToggle(setCaching)}
            />
          </div>
          <div className="opt-item">
            <div className="opt-icon">
              <Zap size={24} />
            </div>
            <div className="opt-info">
              <h4>Compression</h4>
              <p>Compress data transfers for faster loading</p>
            </div>
            <ToggleSwitch
              checked={compression}
              onChange={handleToggle(setCompression)}
            />
          </div>
          <div className="opt-item">
            <div className="opt-icon">
              <Activity size={24} />
            </div>
            <div className="opt-info">
              <h4>Async Loading</h4>
              <p>Load data without blocking interactions</p>
            </div>
            <ToggleSwitch
              checked={asyncLoading}
              onChange={handleToggle(setAsyncLoading)}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Resource Management */}
      <SettingGroup
        title="Resource Management"
        description="Control system resource usage"
      >
        <div className="resource-settings">
          <div className="resource-item">
            <label className="label-text">Max CPU Usage (%)</label>
            <div className="slider-container">
              <input
                type="range"
                min="10"
                max="100"
                value={resourceLimit}
                onChange={(e) => {
                  setResourceLimit(e.target.value)
                  onSettingsChange()
                }}
                className="slider"
              />
              <span className="slider-value">{resourceLimit}%</span>
            </div>
            <p className="help-text">Limit CPU usage to prevent system slowdown</p>
          </div>

          <div className="resource-item">
            <label className="label-text">Memory Limit (MB)</label>
            <select className="select-input" onChange={() => onSettingsChange()}>
              <option>256 MB</option>
              <option>512 MB</option>
              <option>1024 MB</option>
              <option>2048 MB</option>
              <option>Unlimited</option>
            </select>
            <p className="help-text">Maximum memory the dashboard can use</p>
          </div>
        </div>
      </SettingGroup>

      {/* Cache Settings */}
      {caching && (
        <SettingGroup
          title="Cache Management"
          description="Control how data is cached"
        >
          <div className="cache-options">
            <div className="cache-item">
              <div className="cache-info">
                <h4>Cache Size</h4>
                <p>Current cache size: 245 MB of 500 MB</p>
              </div>
              <div className="cache-actions">
                <button className="btn-cache">Clear Cache</button>
              </div>
            </div>

            <div className="cache-settings-grid">
              <div>
                <label className="label-text">Cache Duration</label>
                <select className="select-input" onChange={() => onSettingsChange()}>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>1 day</option>
                  <option>7 days</option>
                </select>
              </div>
              <div>
                <label className="label-text">Cache Strategy</label>
                <select className="select-input" onChange={() => onSettingsChange()}>
                  <option>LRU (Least Recently Used)</option>
                  <option>LFU (Least Frequently Used)</option>
                  <option>FIFO (First In First Out)</option>
                </select>
              </div>
            </div>
          </div>
        </SettingGroup>
      )}

      {/* Network Settings */}
      <SettingGroup
        title="Network Settings"
        description="Optimize network-related performance"
      >
        <div className="network-options">
          <div className="network-item">
            <label className="label-text">Connection Quality</label>
            <select className="select-input" onChange={() => onSettingsChange()}>
              <option>Fast (Uncompressed)</option>
              <option>Normal (Compressed)</option>
              <option>Slow (Heavily Compressed)</option>
              <option>Auto-detect</option>
            </select>
          </div>

          <div className="network-item">
            <label className="label-text">Batch Size</label>
            <select className="select-input" onChange={() => onSettingsChange()}>
              <option>Small (50 items)</option>
              <option>Medium (100 items)</option>
              <option>Large (500 items)</option>
              <option>Full (All items)</option>
            </select>
            <p className="help-text">Number of items loaded at once</p>
          </div>

          <div className="network-item">
            <label className="label-text">Request Timeout</label>
            <select className="select-input" onChange={() => onSettingsChange()}>
              <option>5 seconds</option>
              <option>10 seconds</option>
              <option>30 seconds</option>
              <option>60 seconds</option>
            </select>
          </div>
        </div>
      </SettingGroup>

      {/* System Metrics */}
      <SettingGroup
        title="System Performance"
        description="Current system resource usage"
      >
        <div className="metrics-grid">
          <div className="metric">
            <div className="metric-header">
              <span className="metric-name">CPU Usage</span>
              <span className="metric-stat">32%</span>
            </div>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: '32%' }}></div>
            </div>
          </div>
          <div className="metric">
            <div className="metric-header">
              <span className="metric-name">Memory Usage</span>
              <span className="metric-stat">512 MB / 2048 MB</span>
            </div>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: '25%' }}></div>
            </div>
          </div>
          <div className="metric">
            <div className="metric-header">
              <span className="metric-name">Network Latency</span>
              <span className="metric-stat">45ms</span>
            </div>
            <div className="metric-bar">
              <div className="metric-fill good" style={{ width: '45%' }}></div>
            </div>
          </div>
          <div className="metric">
            <div className="metric-header">
              <span className="metric-name">Cache Hit Rate</span>
              <span className="metric-stat">78%</span>
            </div>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>
      </SettingGroup>

      {/* Advanced Settings */}
      <SettingGroup
        title="Advanced Settings"
        description="Fine-tune performance parameters"
      >
        <div className="advanced-settings">
          <div className="setting-row">
            <div className="setting-col">
              <label className="label-text">Prefetch Strategy</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>Aggressive</option>
                <option>Balanced</option>
                <option>Conservative</option>
                <option>Disabled</option>
              </select>
            </div>
            <div className="setting-col">
              <label className="label-text">Update Frequency</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>Real-time</option>
                <option>Every 5 seconds</option>
                <option>Every 10 seconds</option>
                <option>Every 30 seconds</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-col">
              <label className="label-text">Worker Threads</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>1</option>
                <option>2</option>
                <option>4 (Recommended)</option>
                <option>8</option>
              </select>
            </div>
            <div className="setting-col">
              <label className="label-text">Debug Mode</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>Disabled</option>
                <option>Errors Only</option>
                <option>Verbose</option>
              </select>
            </div>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

export default PerformanceSettings
