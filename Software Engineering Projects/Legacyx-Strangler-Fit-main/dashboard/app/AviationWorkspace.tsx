"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import MigrationPanel from "./MigrationPanel";
import AuditLogPanel from "./AuditLogPanel";
import {
  getFlights,
  getPassengers,
  getAircraft,
  getBaggage,
  updateBaggageStatus,
  dispatchFlightStatus,
  AviationFlight,
  AviationPassenger,
  AviationAircraft,
  AviationBaggageItem,
} from "@/lib/api";

const FLIGHT_PROGRESSION: Record<string, string> = {
  Scheduled: "Boarding",
  Boarding: "Airborne",
  Airborne: "Landed",
};

const BAGGAGE_PROGRESSION: Record<string, string> = {
  CheckedIn: "ScannedAtGate",
  ScannedAtGate: "Loaded",
  Loaded: "Claimed",
};

// Aviation's cutover authority, the counterparts to retail's
// ADMIN/MIGRATION_ENGINEER. The three operational roles below can read the
// routing table but not move it.
const CAN_WRITE_ROLES = ["AVIATION_ADMIN", "AVIATION_MIGRATION_ENGINEER"];

// Admin-only, matching retail. This was briefly open to all three
// operational roles, but only because there was no aviation admin role to
// give it to — an audit log that every operator can read is a log that
// records them without protecting them.
const AUDIT_VIEW_ROLES = ["AVIATION_ADMIN"];

// AVIATION_ADMIN is included as the break-glass role; the gateway's
// Policies.DispatchFlight says the same thing server-side.
const CAN_DISPATCH_ROLES = ["FlightDispatcher", "AVIATION_ADMIN"];

// The aviation tenant's workspace — a different navigation tree
// entirely from retail's (Flight Board / Passenger Manifests / Fleet
// Status / Gate Check-in instead of Orders / Customers / Inventory),
// swapped in by app/page.tsx purely based on the JWT's tenant_id.
//
// Every read below now goes through a domain that can be toggled between
// the legacy monolith and the extracted service, so the same tables render
// whichever side is live — that's the point of the cutover controls further
// down, and the reason a mismatch in either JSON shape would show up here
// first.
export default function AviationWorkspace() {
  const { token, role } = useAuth();

  const [flights, setFlights] = useState<AviationFlight[] | null>(null);
  const [passengers, setPassengers] = useState<AviationPassenger[] | null>(null);
  const [aircraft, setAircraft] = useState<AviationAircraft[] | null>(null);
  const [baggage, setBaggage] = useState<AviationBaggageItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canDispatch = CAN_DISPATCH_ROLES.includes(role || "");
  const canCheckIn = role === "GateAgent";

  const refresh = useCallback(async () => {
    try {
      const [f, p, a, b] = await Promise.all([getFlights(), getPassengers(), getAircraft(), getBaggage()]);
      setFlights(f);
      setPassengers(p);
      setAircraft(a);
      setBaggage(b);
      setError(null);
    } catch {
      setError("Can't reach the gateway. Is it running? (docker compose up)");
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function advanceFlight(flight: AviationFlight) {
    const next = FLIGHT_PROGRESSION[flight.status];
    if (!token || !canDispatch || !next) return;
    setBusyId(flight.flightId);
    try {
      await dispatchFlightStatus(token, flight.flightId, next);
      await refresh();
    } catch {
      setError(`Failed to update flight ${flight.flightId}.`);
    } finally {
      setBusyId(null);
    }
  }

  async function advanceBaggage(item: AviationBaggageItem) {
    const next = BAGGAGE_PROGRESSION[item.status];
    if (!canCheckIn || !next) return;
    setBusyId(item.tagId);
    try {
      await updateBaggageStatus(item.tagId, next);
      await refresh();
    } catch {
      setError(`Failed to update bag ${item.tagId}.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && <div className="error">{error}</div>}

      <section className="card">
        <h2>Flight board</h2>
        {!canDispatch && <p className="hint" style={{ marginBottom: "0.75rem" }}>Your role ({role}) can view the board but not dispatch — {CAN_DISPATCH_ROLES.join(" or ")} required.</p>}
        <table className="auditTable">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Route</th>
              <th>Tail</th>
              <th>Departure</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flights?.map((f) => (
              <tr key={f.flightId}>
                <td>{f.flightId.slice(0, 8)}</td>
                <td>{f.routeId}</td>
                <td>{f.tailNumber}</td>
                <td>{new Date(f.scheduledDeparture).toLocaleString()}</td>
                <td>{f.status}</td>
                <td>
                  {FLIGHT_PROGRESSION[f.status] && (
                    <button
                      className="button"
                      disabled={!canDispatch || busyId === f.flightId}
                      onClick={() => advanceFlight(f)}
                    >
                      {busyId === f.flightId ? "…" : `→ ${FLIGHT_PROGRESSION[f.status]}`}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {flights && flights.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">No flights scheduled yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Fleet status</h2>
        <table className="auditTable">
          <thead>
            <tr>
              <th>Tail</th>
              <th>Model</th>
              <th>Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {aircraft?.map((a) => (
              <tr key={a.tailNumber}>
                <td>{a.tailNumber}</td>
                <td>{a.model}</td>
                <td>{a.maxCapacity}</td>
                <td>{a.status}</td>
              </tr>
            ))}
            {aircraft && aircraft.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">No aircraft registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Passenger manifest</h2>
        <table className="auditTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Nationality</th>
              <th>Date of birth</th>
            </tr>
          </thead>
          <tbody>
            {passengers?.map((p) => (
              <tr key={p.passengerId}>
                <td>{p.fullName}</td>
                <td>{p.nationality}</td>
                <td>{new Date(p.dateOfBirth).toLocaleDateString()}</td>
              </tr>
            ))}
            {passengers && passengers.length === 0 && (
              <tr>
                <td colSpan={3} className="hint">No passengers on file yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Gate check-in</h2>
        {!canCheckIn && <p className="hint" style={{ marginBottom: "0.75rem" }}>Your role ({role}) can view bags but not check them in — GateAgent required.</p>}
        <table className="auditTable">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Weight (kg)</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {baggage?.map((b) => (
              <tr key={b.tagId}>
                <td>{b.tagId}</td>
                <td>{b.weightKg}</td>
                <td>{b.status}</td>
                <td>
                  {BAGGAGE_PROGRESSION[b.status] && (
                    <button
                      className="button"
                      disabled={!canCheckIn || busyId === b.tagId}
                      onClick={() => advanceBaggage(b)}
                    >
                      {busyId === b.tagId ? "…" : `→ ${BAGGAGE_PROGRESSION[b.status]}`}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {baggage && baggage.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">No baggage checked in yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Below the operational sections on purpose. Retail leads with the
          routing grid because retail's workspace *is* the migration
          console; aviation's is an operations console that happens to have
          migration controls attached, and a GateAgent shouldn't have to
          scroll past eleven cards they can't click to reach their bags. */}
      <MigrationPanel canWriteRoles={CAN_WRITE_ROLES} />
      <AuditLogPanel viewRoles={AUDIT_VIEW_ROLES} />
    </>
  );
}
