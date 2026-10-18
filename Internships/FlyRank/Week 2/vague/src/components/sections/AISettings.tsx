import { useState } from 'react'
import { Cpu, Zap, TrendingUp } from 'lucide-react'
import SettingGroup from '../common/SettingGroup'
import ToggleSwitch from '../common/ToggleSwitch'
import './AISettings.css'

interface AISettingsProps {
  onSettingsChange: () => void
}

const AISettings = ({ onSettingsChange }: AISettingsProps) => {
  const [autoTraining, setAutoTraining] = useState(true)
  const [autoOptimization, setAutoOptimization] = useState(true)
  const [experimentalFeatures, setExperimentalFeatures] = useState(false)
  const [modelVersion, setModelVersion] = useState('v2.1.0')
  const [batchSize, setBatchSize] = useState('32')
  const [learningRate, setLearningRate] = useState('0.001')
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.85')

  const handleToggle = (setter: (value: boolean) => void) => {
    return (checked: boolean) => {
      setter(checked)
      onSettingsChange()
    }
  }

  const handleInputChange = (setter: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value)
      onSettingsChange()
    }
  }

  return (
    <div className="ai-settings">
      <h2>AI & Model Settings</h2>

      {/* Model Configuration */}
      <SettingGroup
        title="Model Configuration"
        description="Configure your AI model parameters"
      >
        <div className="config-grid">
          <div className="config-item">
            <label className="label-text">Model Version</label>
            <select
              className="select-input"
              value={modelVersion}
              onChange={handleInputChange(setModelVersion)}
            >
              <option>v2.1.0 (Latest)</option>
              <option>v2.0.5</option>
              <option>v1.9.8</option>
              <option>v1.8.0</option>
            </select>
          </div>
          <div className="config-item">
            <label className="label-text">Batch Size</label>
            <input
              type="number"
              className="input-field"
              value={batchSize}
              onChange={handleInputChange(setBatchSize)}
              min="1"
              max="256"
            />
          </div>
          <div className="config-item">
            <label className="label-text">Learning Rate</label>
            <input
              type="number"
              className="input-field"
              value={learningRate}
              onChange={handleInputChange(setLearningRate)}
              step="0.0001"
              min="0"
              max="1"
            />
          </div>
          <div className="config-item">
            <label className="label-text">Confidence Threshold</label>
            <input
              type="number"
              className="input-field"
              value={confidenceThreshold}
              onChange={handleInputChange(setConfidenceThreshold)}
              step="0.01"
              min="0"
              max="1"
            />
          </div>
        </div>
      </SettingGroup>

      {/* Training */}
      <SettingGroup
        title="Training"
        description="Manage automated model training"
      >
        <div className="training-options">
          <div className="training-item">
            <div className="item-info">
              <h4>Auto Training</h4>
              <p>Automatically retrain the model when new data is available</p>
            </div>
            <ToggleSwitch
              checked={autoTraining}
              onChange={handleToggle(setAutoTraining)}
            />
          </div>

          {autoTraining && (
            <div className="training-schedule">
              <h5>Training Schedule</h5>
              <div className="schedule-grid">
                <div>
                  <label className="label-text">Training Frequency</label>
                  <select className="select-input" onChange={() => onSettingsChange()}>
                    <option>Daily</option>
                    <option>Every 2 days</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Preferred Time</label>
                  <input
                    type="time"
                    className="input-field"
                    defaultValue="02:00"
                    onChange={() => onSettingsChange()}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="training-item">
            <div className="item-info">
              <h4>Auto Optimization</h4>
              <p>Automatically optimize model for performance</p>
            </div>
            <ToggleSwitch
              checked={autoOptimization}
              onChange={handleToggle(setAutoOptimization)}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Inference Settings */}
      <SettingGroup
        title="Inference Settings"
        description="Configure how the model makes predictions"
      >
        <div className="inference-settings">
          <div className="setting-row">
            <div className="setting-col">
              <label className="label-text">Inference Mode</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>Fast (Lower Accuracy)</option>
                <option>Balanced</option>
                <option>Accurate (Slower)</option>
              </select>
            </div>
            <div className="setting-col">
              <label className="label-text">GPU Utilization</label>
              <select className="select-input" onChange={() => onSettingsChange()}>
                <option>Conservative (20%)</option>
                <option>Moderate (50%)</option>
                <option>Aggressive (80%)</option>
              </select>
            </div>
          </div>
        </div>
      </SettingGroup>

      {/* Advanced Features */}
      <SettingGroup
        title="Advanced Features"
        description="Enable experimental AI features"
      >
        <div className="advanced-features">
          <div className="feature-item">
            <div className="feature-icon">
              <Cpu size={24} />
            </div>
            <div className="feature-info">
              <h4>Experimental Features</h4>
              <p>Test cutting-edge AI features before official release</p>
            </div>
            <ToggleSwitch
              checked={experimentalFeatures}
              onChange={handleToggle(setExperimentalFeatures)}
            />
          </div>

          {experimentalFeatures && (
            <div className="experimental-list">
              <label className="feature-checkbox">
                <input type="checkbox" onChange={() => onSettingsChange()} />
                <span>Multi-model Ensemble</span>
              </label>
              <label className="feature-checkbox">
                <input type="checkbox" onChange={() => onSettingsChange()} />
                <span>Zero-shot Learning</span>
              </label>
              <label className="feature-checkbox">
                <input type="checkbox" onChange={() => onSettingsChange()} />
                <span>Federated Learning</span>
              </label>
              <label className="feature-checkbox">
                <input type="checkbox" onChange={() => onSettingsChange()} />
                <span>Differential Privacy</span>
              </label>
            </div>
          )}
        </div>
      </SettingGroup>

      {/* Model Performance */}
      <SettingGroup
        title="Performance Metrics"
        description="View your model's current performance"
      >
        <div className="performance-metrics">
          <div className="metric-card">
            <div className="metric-icon accuracy">
              <TrendingUp size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Accuracy</span>
              <span className="metric-value">94.2%</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon precision">
              <Zap size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Precision</span>
              <span className="metric-value">92.8%</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon f1">
              <Cpu size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-label">F1 Score</span>
              <span className="metric-value">93.5%</span>
            </div>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

export default AISettings
