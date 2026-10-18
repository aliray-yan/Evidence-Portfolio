import { apiFetch } from './request';
import { API_BASE_URL, LOCAL_MODE } from './config';
import { readLocal, localSave, localProject } from './localStore';
import { checkFloorPlan, assertFloorPlan } from '../utils/planValidation';
import type { FloorPlan } from '../types/floorPlan';
/**
* Returns null when nothing has been saved yet (404) — that's an expected,
* normal state, not an error. Throws for anything else that goes wrong.
*/
export async function getFloorPlan(projectId: string): Promise<FloorPlan | null> {
  if (LOCAL_MODE) {
    localProject(projectId);
    const plan = readLocal().plans[projectId] ?? null;
    if (plan)
      assertFloorPlan(plan);
    return plan;
  }
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/floor-plan`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load floor plan (${response.status})`);
  }
  const plan: unknown = await response.json();
  assertFloorPlan(plan);
  return plan;
}
export async function saveFloorPlan(projectId: string, floorPlan: FloorPlan): Promise<FloorPlan> {
  assertFloorPlan(floorPlan);
  if (LOCAL_MODE)
    return localSave(projectId, floorPlan);
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/floor-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(floorPlan),
  });
  if (!response.ok) {
    throw new Error(`Failed to save floor plan (${response.status})`);
  }
  const plan: unknown = await response.json();
  assertFloorPlan(plan);
  return plan;
}
export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  elementId?: string;
}
export async function validateFloorPlan(projectId: string, floorPlan: FloorPlan): Promise<ValidationIssue[]> {
  if (LOCAL_MODE)
    return checkFloorPlan(floorPlan);
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/floor-plan/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(floorPlan),
  });
  if (!response.ok) {
    throw new Error(`Failed to validate floor plan (${response.status})`);
  }
  const data = (await response.json()) as {
    issues: ValidationIssue[];
  };
  return data.issues;
}
