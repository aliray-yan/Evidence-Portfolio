"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getAuditLog, AuditEntry } from "@/lib/api";

interface Props {
  // Roles in the signed-in tenant permitted to read the log. Renders
  // nothing for anyone else — the gateway would 403 anyway, this just
  // avoids showing an empty card that can never fill.
  viewRoles: string[];
}

// Shared by both workspaces. The gateway scopes the response to the
// caller's tenant, so this never needs to filter anything itself.
export default function AuditLogPanel({ viewRoles }: Props) {
  const { token, role } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  const canView = viewRoles.includes(role || "");

  const refresh = useCallback(async () => {
    if (!token || !canView) return;
    try {
      setEntries(await getAuditLog(token));
    } catch {
      // The log is supporting detail, not the point of either workspace —
      // a failure here shouldn't take the rest of the page down with it.
    }
  }, [token, canView]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!canView) return null;

  return (
    <section className="card">
      <h2>Recent audit log</h2>
      {entries === null && <p className="hint">Loading…</p>}
      {entries && entries.length === 0 && <p className="hint">No changes recorded yet.</p>}
      {entries && entries.length > 0 && (
        <table className="auditTable">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              {/* The log now carries more than routing changes — cross-tenant
                  denials and flight dispatches land here too, and without the
                  action they all read as "old → new". */}
              <th>Action</th>
              <th>Target</th>
              <th>Change</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .slice()
              .reverse()
              .slice(0, 10)
              .map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.timestamp).toLocaleTimeString()}</td>
                  <td>{entry.user}</td>
                  <td>{entry.action}</td>
                  <td>{entry.domain}</td>
                  <td>
                    {entry.oldValue ?? "—"} → {entry.newValue ?? "—"}
                  </td>
                  <td className={entry.result === "SUCCESS" ? "resultOk" : "resultFail"}>{entry.result}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
