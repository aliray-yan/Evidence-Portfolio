import { apiFetch } from './request';
import { API_BASE_URL, LOCAL_MODE } from './config';
import { readLocal, localCreate, localProject } from './localStore';
export interface Project {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
export async function listProjects(): Promise<Project[]> {
  if (LOCAL_MODE)
    return readLocal().projects;
  const response = await apiFetch(`${API_BASE_URL}/api/projects`);
  if (!response.ok) {
    throw new Error(`Failed to load projects (${response.status})`);
  }
  return response.json() as Promise<Project[]>;
}
export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<Project> {
  if (LOCAL_MODE)
    return localCreate(input);
  const response = await apiFetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to create project (${response.status})`);
  }
  return response.json() as Promise<Project>;
}
export async function getProject(id: string): Promise<Project> {
  if (LOCAL_MODE)
    return localProject(id);
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load project ${id} (${response.status})`);
  }
  return response.json() as Promise<Project>;
}
