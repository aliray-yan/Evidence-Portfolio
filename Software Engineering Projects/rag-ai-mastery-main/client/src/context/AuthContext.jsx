import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);
const standaloneMode = import.meta.env.VITE_STANDALONE_MODE === "true";
const standaloneUser = {
  id: "standalone-learner",
  name: "Standalone Learner",
  email: "student@ragmastery.local",
  role: "STUDENT",
  streakCount: 1,
  createdAt: new Date().toISOString()
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(standaloneMode ? standaloneUser : null);
  const [loading, setLoading] = useState(standaloneMode ? false : Boolean(api.getToken()));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (standaloneMode) {
        setLoading(false);
        return;
      }

      if (!api.getToken()) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.get("/auth/me");
        if (active) setUser(data.user);
      } catch (_err) {
        api.setToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    setError("");
    if (standaloneMode) {
      setUser({ ...standaloneUser, email });
      return standaloneUser;
    }
    const data = await api.post("/auth/login", { email, password });
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    setError("");
    if (standaloneMode) {
      const nextUser = { ...standaloneUser, name, email };
      setUser(nextUser);
      return nextUser;
    }
    const data = await api.post("/auth/register", { name, email, password });
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    if (standaloneMode) {
      setUser(standaloneUser);
      return;
    }
    api.setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      setError,
      login,
      register,
      logout,
      isAdmin: user?.role === "ADMIN",
      standaloneMode
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
