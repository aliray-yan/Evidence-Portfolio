import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await register(form.name, form.email, form.password);
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
        <h1>Create account</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Name<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
        <label>Email<input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" required /></label>
        <label>Password<input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" minLength={8} required /></label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          <UserPlus size={18} /> Register
        </button>
        <Link to="/login">Already have an account?</Link>
      </form>
    </main>
  );
}
