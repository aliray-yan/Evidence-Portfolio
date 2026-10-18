import { Moon, Server, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { api } from "../services/api.js";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Settings</span>
        <h1>Platform preferences</h1>
      </div>
      <div className="settings-list">
        <div>
          <span><Server size={18} /> API endpoint</span>
          <code>{api.apiUrl}</code>
        </div>
        <div>
          <span>{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />} Color mode</span>
          <button className="btn btn-secondary" type="button" onClick={toggleTheme}>Switch to {theme === "dark" ? "light" : "dark"}</button>
        </div>
        <div className="alert alert-warning">
          Demo credentials are included for local development only and must not be used in production.
        </div>
      </div>
    </section>
  );
}
