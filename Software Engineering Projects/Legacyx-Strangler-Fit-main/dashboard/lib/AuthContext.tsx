"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthState {
  token: string | null;
  role: string | null;
  username: string | null;
  tenantId: string | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (token: string, role: string, username: string, tenantId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// A real production dashboard would prefer an httpOnly cookie over
// localStorage (XSS-resistant); localStorage is a reasonable, common
// simplification for a demo that only ever talks to a local gateway —
// noted here rather than treated as a hidden gap.
const STORAGE_KEY = "legacyx-dashboard-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>({ token: null, role: null, username: null, tenantId: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAuthState(JSON.parse(stored));
      } catch {
        // corrupt storage — ignore, user just logs in again
      }
    }
    setHydrated(true);
  }, []);

  function setAuth(token: string, role: string, username: string, tenantId: string) {
    const next = { token, role, username, tenantId };
    setAuthState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function logout() {
    setAuthState({ token: null, role: null, username: null, tenantId: null });
    localStorage.removeItem(STORAGE_KEY);
  }

  if (!hydrated) return null; // avoids a flash of the login page before storage is read

  return <AuthContext.Provider value={{ ...auth, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
