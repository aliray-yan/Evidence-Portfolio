import {
  Award,
  BookOpen,
  Bookmark,
  Brain,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  TerminalSquare,
  User,
  X
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { initials } from "../utils/format.js";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learning-path", label: "Learning Path", icon: GraduationCap },
  { to: "/skill-tree", label: "Skill Tree", icon: Brain },
  { to: "/exercises", label: "Practice", icon: ClipboardList },
  { to: "/projects", label: "Projects", icon: TerminalSquare },
  { to: "/library", label: "Reference", icon: Library },
  { to: "/search", label: "Search", icon: Search },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/achievements", label: "Badges", icon: Award },
  { to: "/certificate", label: "Certificate", icon: FileText }
];

export default function AppShell() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">.N</div>
          <div>
            <strong>.NET Mastery</strong>
            <span>Ali Rayyan</span>
          </div>
          <button className="icon-btn mobile-only" title="Close navigation" type="button" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {isAdmin && (
            <NavLink to="/admin" onClick={() => setOpen(false)}>
              <Shield size={18} />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-only" title="Open navigation" type="button" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <BookOpen size={20} />
            <span>Zero to Advanced</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" title="Toggle color mode" type="button" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink className="profile-chip" to="/profile">
              <span>{initials(user?.name)}</span>
              <strong>{user?.name || "Learner"}</strong>
            </NavLink>
            <button className="icon-btn" title="Settings" type="button" onClick={() => navigate("/settings")}>
              <Settings size={18} />
            </button>
            <button className="icon-btn" title="Logout" type="button" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
