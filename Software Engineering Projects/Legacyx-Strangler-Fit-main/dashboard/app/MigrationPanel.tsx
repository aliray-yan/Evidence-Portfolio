"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getRouting,
  getCircuitBreakers,
  setRoutingMode,
  ApiError,
  RoutingTable,
  CircuitBreakerTable,
} from "@/lib/api";

interface Props {
  // Roles in the signed-in tenant that may actually move a domain. This
  // only decides whether the button is clickable — the gateway enforces
  // the same rule independently (Security/RolePolicy.cs), so a read-only
  // role is simply not invited to fail rather than being trusted.
  canWriteRoles: string[];
}

// The cutover controls, shared by both tenants' workspaces.
//
// Extracted rather than copied into AviationWorkspace: the whole point of
// giving aviation a toggle is that it behaves exactly like retail's, and
// two copies of the same poll-toggle-refresh block would drift apart the
// first time one of them was fixed.
//
// There's deliberately no hardcoded domain list here. /admin/routing
// returns only the caller's own tenant's domains, so the grid is whatever
// the gateway says it is — retail signs in and sees three cards, aviation
// signs in and sees eleven, and neither can fall out of step with
// gateway/Routing/DomainRegistry.cs.
export default function MigrationPanel({ canWriteRoles }: Props) {
  const { token, role, logout } = useAuth();
  const router = useRouter();

  const [routing, setRoutingState] = useState<RoutingTable | null>(null);
  const [breakers, setBreakers] = useState<CircuitBreakerTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [r, b] = await Promise.all([getRouting(token), getCircuitBreakers(token)]);
      setRoutingState(r);
      setBreakers(b);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push("/login");
        return;
      }
      setError("Can't reach the gateway. Is it running? (docker compose up)");
    }
  }, [token, logout, router]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const canWrite = canWriteRoles.includes(role || "");

  async function toggle(domain: string) {
    if (!token || !routing || !canWrite) return;
    const nextMode = routing[domain] === "modern" ? "legacy" : "modern";
    setToggling(domain);
    try {
      await setRoutingMode(token, domain, nextMode);
      await refresh();
    } catch {
      setError(`Failed to change routing for ${domain}.`);
    } finally {
      setToggling(null);
    }
  }

  const domains = routing ? Object.keys(routing) : [];

  return (
    <>
      {error && <div className="error">{error}</div>}

      <section className="card">
        <h2>Domain routing</h2>
        {!canWrite && (
          <p className="hint" style={{ marginBottom: "0.75rem" }}>
            Your role ({role}) can view routing but not change it — {canWriteRoles.join(" or ")} required.
          </p>
        )}
        {routing === null && <p className="hint">Loading…</p>}
        <div className="domainGrid">
          {domains.map((domain) => {
            const isModern = routing![domain] === "modern";
            return (
              <div key={domain} className="domainCard">
                <div className="domainName">{domain}</div>
                <span className={isModern ? "badgeModern" : "badgeLegacy"}>{routing![domain]}</span>
                <button
                  onClick={() => toggle(domain)}
                  disabled={!canWrite || toggling === domain}
                  className="button"
                >
                  {toggling === domain ? "Switching…" : isModern ? "Roll back to legacy" : "Cut over to modern"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Circuit breakers</h2>
        <ul className="breakerList">
          {breakers &&
            Object.entries(breakers).map(([backend, state]) => (
              <li key={backend}>
                <StatusDot state={state} /> {backend} — {state}
              </li>
            ))}
          {breakers && Object.keys(breakers).length === 0 && (
            <li className="hint">No requests forwarded yet — breakers appear here once traffic flows.</li>
          )}
        </ul>
      </section>
    </>
  );
}

function StatusDot({ state }: { state: string }) {
  const cls = state === "Closed" ? "dotOk" : state === "Open" ? "dotBad" : "dotWarn";
  return <span className={cls} />;
}
