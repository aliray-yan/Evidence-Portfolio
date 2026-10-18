import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create student account</h1>
        <p>Start from absolute AI basics and unlock advanced RAG engineering topics.</p>
        <label>
          Name
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label>
          Email
          <input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            minLength={8}
            type="password"
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" disabled={loading} type="submit">
          <UserPlus size={18} /> {loading ? "Creating..." : "Register"}
        </button>
        <Link to="/login">I already have an account</Link>
      </form>
    </main>
  );
}
