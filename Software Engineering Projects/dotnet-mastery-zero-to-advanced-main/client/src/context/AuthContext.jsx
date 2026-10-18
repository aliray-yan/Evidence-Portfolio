import { createContext, useContext, useMemo, useState } from "react";
import { api, setAuthToken } from "../services/api.js";

const AuthContext = createContext(null);

const storedUser = localStorage.getItem("dotnetMastery.user");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null);
  const [loading, setLoading] = useState(false);

  async function login(email, password) {
    setLoading(true);
    try {
      const result = await api.login({ email, password });
      setAuthToken(result.token);
      setUser(result.user);
      localStorage.setItem("dotnetMastery.user", JSON.stringify(result.user));
      return result.user;
    } finally {
      setLoading(false);
    }
  }

  async function register(name, email, password) {
    setLoading(true);
    try {
      const result = await api.register({ name, email, password });
      setAuthToken(result.token);
      setUser(result.user);
      localStorage.setItem("dotnetMastery.user", JSON.stringify(result.user));
      return result.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setAuthToken("");
    setUser(null);
    localStorage.removeItem("dotnetMastery.user");
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, isAdmin: user?.role === "Admin" }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
