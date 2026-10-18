import { ArrowRight, BookOpen, Code2, Database, ShieldCheck, TerminalSquare } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <span className="brand-mark">.N</span>
          <strong>.NET Mastery</strong>
        </Link>
        <div>
          <Link to="/login" className="ghost-link">Login</Link>
          <Link to="/register" className="btn btn-primary">Start learning</Link>
        </div>
      </nav>

      <section className="hero-scene">
        <div className="academy-board">
          <div className="scene-column">
            <div className="terminal-window">
              <div className="window-dots"><span /><span /><span /></div>
              <pre>{`dotnet new webapi
dotnet ef migrations add InitialCreate
npm run dev

Build: .NET Mastery
Role: Zero to Advanced`}</pre>
            </div>
            <div className="skill-radar">
              {["C#", "EF", "API", "Auth", "Blazor", "Cloud"].map((label, index) => (
                <span key={label} style={{ "--i": index }}>{label}</span>
              ))}
            </div>
          </div>
          <div className="scene-column">
            <div className="lesson-stack">
              <span>Lesson reader</span>
              <strong>Console.WriteLine explained</strong>
              <p>Simple explanation, analogy, code, line-by-line notes, quiz, and practice task.</p>
            </div>
            <div className="pipeline">
              <span>Learn</span>
              <ArrowRight size={18} />
              <span>Practice</span>
              <ArrowRight size={18} />
              <span>Build</span>
            </div>
          </div>
        </div>

        <div className="hero-copy">
          <span className="eyebrow">Professional software engineering academy</span>
          <h1>.NET Mastery</h1>
          <p>
            A complete web platform for learning programming, C#, .NET, ASP.NET Core, EF Core, Web APIs, Blazor,
            testing, architecture, security, deployment, and enterprise engineering from zero.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">Create account</Link>
            <Link className="btn btn-secondary" to="/login">Use demo login</Link>
          </div>
          <div className="demo-note">
            Local development demos: admin@dotnetmastery.local / Admin123! and student@dotnetmastery.local / Student123!
          </div>
        </div>
      </section>

      <section className="landing-strip">
        {[
          [BookOpen, "60+ lessons in seed data"],
          [Code2, "200+ quiz questions"],
          [TerminalSquare, "15 guided projects"],
          [Database, "EF Core + PostgreSQL"],
          [ShieldCheck, "JWT role security"]
        ].map(([Icon, text]) => (
          <div key={text}>
            <Icon size={20} />
            <span>{text}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
