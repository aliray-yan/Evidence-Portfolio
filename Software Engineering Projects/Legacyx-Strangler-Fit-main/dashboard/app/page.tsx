"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import RetailWorkspace from "./RetailWorkspace";
import AviationWorkspace from "./AviationWorkspace";

const WORKSPACE_NAME: Record<string, string> = {
  retail: "Migration Dashboard",
  aviation: "Aviation Operations",
};

// Which tenant the JWT belongs to decides the entire navigation tree and
// widget set below — not a route, a full workspace swap. See
// gateway/Program.cs for the server-side half of tenant isolation this
// mirrors: a retail token only ever gets retail data, and vice versa.
export default function Dashboard() {
  const { token, role, username, tenantId, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  if (!token) return null;

  return (
    <main className="main">
      <header className="header">
        <div>
          <h1 className="title">LegacyX {WORKSPACE_NAME[tenantId || ""] ?? "Dashboard"}</h1>
          <p className="subtitle">
            Signed in as {username} ({role} · {tenantId})
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="logoutButton"
        >
          Log out
        </button>
      </header>

      {tenantId === "aviation" ? <AviationWorkspace /> : <RetailWorkspace />}
    </main>
  );
}
