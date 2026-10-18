import { apiFetch } from './request';
import { API_BASE_URL } from './config';
export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  database: 'connected' | 'unavailable';
}
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}
