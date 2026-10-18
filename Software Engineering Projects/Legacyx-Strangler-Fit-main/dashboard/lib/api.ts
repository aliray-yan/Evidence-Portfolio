const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080";

export interface RoutingTable {
  [domain: string]: string;
}

export interface CircuitBreakerTable {
  [backend: string]: string;
}

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  domain: string;
  oldValue: string | null;
  newValue: string | null;
  result: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  tenantId: string;
  expiresInSeconds: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  // Not just 204: the aviation services answer some writes with 204 and
  // others with 200-plus-entity, and which one a caller gets can now depend
  // on which side of a cutover served it. Treating "no body" as undefined
  // instead of calling res.json() unconditionally means a bodyless success
  // never surfaces as a parse error the caller reports as a failure.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function getRouting(token: string): Promise<RoutingTable> {
  return apiFetch<RoutingTable>("/admin/routing", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getCircuitBreakers(token: string): Promise<CircuitBreakerTable> {
  return apiFetch<CircuitBreakerTable>("/admin/circuit-breakers", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function setRoutingMode(
  token: string,
  domain: string,
  mode: string
): Promise<{ domain: string; mode: string }> {
  return apiFetch(`/admin/routing/${domain}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export function getAuditLog(token: string): Promise<AuditEntry[]> {
  return apiFetch<AuditEntry[]>("/admin/audit-log", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Aviation tenant ---
// Business API traffic is unauthenticated by design here too (same
// boundary as retail's customer/order/inventory) — no token needed for
// these reads/writes. The one exception, flight-status dispatch, goes
// through a dedicated FlightDispatcher-gated gateway endpoint below.

export interface AviationFlight {
  flightId: string;
  routeId: string;
  tailNumber: string;
  scheduledDeparture: string;
  status: string;
}

export interface AviationPassenger {
  passengerId: string;
  fullName: string;
  nationality: string;
  dateOfBirth: string;
}

export interface AviationAircraft {
  tailNumber: string;
  model: string;
  maxCapacity: number;
  status: string;
}

export interface AviationBaggageItem {
  tagId: string;
  passengerId: string;
  flightId: string;
  weightKg: number;
  status: string;
}

export const getFlights = () => apiFetch<AviationFlight[]>("/api/aviation/flights");
export const getPassengers = () => apiFetch<AviationPassenger[]>("/api/aviation/passengers");
export const getAircraft = () => apiFetch<AviationAircraft[]>("/api/aviation/aircraft");
export const getBaggage = () => apiFetch<AviationBaggageItem[]>("/api/aviation/baggage");

export function updateBaggageStatus(tagId: string, status: string): Promise<void> {
  return apiFetch(`/api/aviation/baggage/${tagId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

// FlightDispatcher-gated — see gateway/Program.cs's
// PUT /admin/aviation/flights/{id}/status.
export function dispatchFlightStatus(token: string, flightId: string, status: string): Promise<AviationFlight> {
  return apiFetch(`/admin/aviation/flights/${flightId}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
