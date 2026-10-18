import { LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("student@dotnetmastery.local");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/" className="landing-brand">
          <span className="brand-mark">.N</span>
          <strong>.NET Mastery</strong>
        </Link>
        <h1>Welcome back</h1>
        <p>Demo credentials are for local development only.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          <LogIn size={18} /> Login
        </button>
        <Link to="/register">Create a student account</Link>
      </form>
    </main>
  );
}
