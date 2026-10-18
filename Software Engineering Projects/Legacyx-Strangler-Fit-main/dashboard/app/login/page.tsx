"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, role, tenantId } = await login(username, password);
      setAuth(token, role, username, tenantId);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts — wait a minute and try again.");
      } else {
        setError("Invalid username or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <h1 className="title">LegacyX</h1>
        <p className="subtitle">Migration Dashboard</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading} className="button">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
