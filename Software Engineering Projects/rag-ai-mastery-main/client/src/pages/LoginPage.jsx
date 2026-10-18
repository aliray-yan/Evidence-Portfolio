import { LogIn, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("student@ragmastery.local");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/" className="brand-lockup">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>RAG AI Mastery</strong>
            <small>Ali Rayyan</small>
          </span>
        </Link>
        <h1>Welcome back</h1>
        <p>Use the demo student or admin account after seeding the database.</p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" disabled={loading} type="submit">
          <LogIn size={18} /> {loading ? "Signing in..." : "Login"}
        </button>
        <div className="auth-hint">
          Admin: admin@ragmastery.local / Admin123!
          <br />
          Student: student@ragmastery.local / Student123!
        </div>
        <Link to="/register">Create a new student account</Link>
      </form>
    </main>
  );
}
