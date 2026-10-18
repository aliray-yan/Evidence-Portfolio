import { useState } from 'react'
import {
  Settings,
  Bell,
  Shield,
  Database,
  Zap,
  User,
  Save,
  X
} from 'lucide-react'
import AccountSettings from '../components/sections/AccountSettings'
import NotificationSettings from '../components/sections/NotificationSettings'
import SecuritySettings from '../components/sections/SecuritySettings'
import AISettings from '../components/sections/AISettings'
import DataSettings from '../components/sections/DataSettings'
import PerformanceSettings from '../components/sections/PerformanceSettings'
import './SettingsPage.css'

interface Section {
  id: string
  label: string
  icon: React.ElementType
  component: React.ElementType
}

interface SettingsPageProps {
  onThemeToggle: (isDark: boolean) => void
}

const SettingsPage = ({ onThemeToggle }: SettingsPageProps) => {
  const [activeSection, setActiveSection] = useState('account')
  const [hasChanges, setHasChanges] = useState(false)
  const [showSaveNotification, setShowSaveNotification] = useState(false)

  const sections: Section[] = [
    {
      id: 'account',
      label: 'Account',
      icon: User,
      component: AccountSettings
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      component: NotificationSettings
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      component: SecuritySettings
    },
    {
      id: 'ai',
      label: 'AI Settings',
      icon: Zap,
      component: AISettings
    },
    {
      id: 'data',
      label: 'Data & Privacy',
      icon: Database,
      component: DataSettings
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: Settings,
      component: PerformanceSettings
    }
  ]

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component

  const handleSaveSettings = () => {
    setShowSaveNotification(true)
    setHasChanges(false)
    setTimeout(() => setShowSaveNotification(false), 3000)
  }

  const handleReset = () => {
    setHasChanges(false)
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1>Settings</h1>
          <p>Manage your AI dashboard preferences and configurations</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={20} />
                  <span>{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="settings-content">
          {ActiveComponent && (
            <ActiveComponent
              onThemeToggle={onThemeToggle}
              onSettingsChange={() => setHasChanges(true)}
            />
          )}
        </main>
      </div>

      {/* Footer with Action Buttons */}
      {hasChanges && (
        <div className="settings-footer">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
          >
            <X size={18} />
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      )}

      {/* Save Notification */}
      {showSaveNotification && (
        <div className="notification notification-success">
          <span>✓ Settings saved successfully</span>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
