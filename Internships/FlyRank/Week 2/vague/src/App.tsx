import { useState } from 'react'
import SettingsPage from './pages/SettingsPage'
import './App.css'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <SettingsPage onThemeToggle={(dark) => setIsDarkMode(dark)} />
    </div>
  )
}

export default App
