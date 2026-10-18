import { ArrowRight, BookOpen, BrainCircuit, Database, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PipelineDiagram from "../components/PipelineDiagram.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>RAG AI Mastery</strong>
            <small>Ali Rayyan</small>
          </span>
        </Link>
        <div className="landing-actions">
          <button className="ghost-button" onClick={toggleTheme} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {user ? (
            <Link className="primary-button" to="/dashboard">
              Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link className="ghost-button" to="/login">
                Login
              </Link>
              <Link className="primary-button" to="/register">
                Start Learning <ArrowRight size={18} />
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="landing-hero">
        <section className="hero-copy">
          <div className="eyebrow">Zero to Advanced AI Engineering Academy</div>
          <h1>RAG AI Mastery</h1>
          <p>
            Learn AI, LLMs, embeddings, vector databases, chunking, semantic search, reranking, evaluation, security,
            local models, and production RAG architecture through lessons, quizzes, projects, and a local demo playground.
          </p>
          <div className="hero-actions">
            <Link className="primary-button large" to={user ? "/learning-path" : "/register"}>
              Open Learning Path <BookOpen size={18} />
            </Link>
            <Link className="secondary-button large" to={user ? "/playground" : "/login"}>
              Try Playground <PlayCircle size={18} />
            </Link>
          </div>
        </section>

        <section className="hero-panel" aria-label="RAG pipeline preview">
          <PipelineDiagram />
          <div className="hero-metrics">
            <div>
              <strong>21</strong>
              <span>Levels</span>
            </div>
            <div>
              <strong>200+</strong>
              <span>Lessons</span>
            </div>
            <div>
              <strong>Mock</strong>
              <span>Free mode</span>
            </div>
          </div>
        </section>
      </main>

      <section className="feature-band">
        {[
          [BrainCircuit, "AI fundamentals", "Starts at what AI, ML, prompts, tokens, and LLMs mean."],
          [Database, "Vector search demos", "See chunks, fake embeddings, retrieval scores, and citations."],
          [ShieldCheck, "Production mindset", "Covers security, privacy, evaluation, observability, and deployment."]
        ].map(([Icon, title, text]) => (
          <article className="feature-card" key={title}>
            <Icon size={24} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
