import {
  Award,
  BookOpen,
  Brain,
  ChartNoAxesColumnIncreasing,
  Code2,
  FolderKanban,
  Gauge,
  GraduationCap,
  Library,
  LogOut,
  Moon,
  PanelLeft,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/learning-path", label: "Learning Path", icon: GraduationCap },
  { to: "/search", label: "Search Lessons", icon: Search },
  { to: "/code-labs", label: "Code Labs", icon: Code2 },
  { to: "/playground", label: "RAG Playground", icon: Brain },
  { to: "/exercises", label: "Exercises", icon: BookOpen },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/evaluation", label: "Evaluation", icon: ChartNoAxesColumnIncreasing },
  { to: "/tools", label: "Tool Library", icon: Library },
  { to: "/certificate", label: "Certificate", icon: Award }
];

const standaloneNavItems = navItems.filter((item) =>
  [
    "/dashboard",
    "/learning-path",
    "/search",
    "/code-labs",
    "/playground",
    "/exercises",
    "/projects",
    "/evaluation",
    "/tools",
    "/certificate"
  ].includes(item.to)
);

export default function AppLayout() {
  const { user, logout, isAdmin, standaloneMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand-lockup">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>RAG AI Mastery</strong>
            <small>Ali Rayyan</small>
          </span>
        </NavLink>

        <nav className="side-nav">
          {(standaloneMode ? standaloneNavItems : navItems).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="nav-divider" />
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
                <Shield size={18} />
                <span>Admin Stats</span>
              </NavLink>
              <NavLink to="/admin/content" className={({ isActive }) => (isActive ? "active" : "")}>
                <Settings size={18} />
                <span>Content Admin</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title">
            <PanelLeft size={20} />
            <span>Zero to Advanced RAG Engineering Academy</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="user-pill">
              <span>{user?.name}</span>
              <small>{user?.role}</small>
            </div>
            <button className="icon-button" onClick={handleLogout} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
