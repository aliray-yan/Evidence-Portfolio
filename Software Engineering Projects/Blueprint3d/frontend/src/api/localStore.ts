import type { Project } from './projects';
import type { FloorPlan } from '../types/floorPlan';
import type { Blueprint } from './blueprints';
interface LocalData {
  version: 1;
  projects: Project[];
  plans: Record<string, FloorPlan>;
  blueprints: Record<string, (Blueprint & {
    dataUrl: string;
  })[]>;
}
const KEY = 'blueprint3d.workspace.v1';
export function readLocal(): LocalData {
  const raw = localStorage.getItem(KEY);
  if (!raw)
    return { version: 1, projects: [], plans: {}, blueprints: {} };
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.projects) || !data.plans || !data.blueprints)
      throw new Error();
    return data;
  }
  catch {
    throw new Error('Your saved workspace could not be read. Export your browser data before resetting it.');
  }
}
export function writeLocal(data: LocalData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  catch {
    throw new Error('Browser storage is full or unavailable. Export a project backup, or use a smaller blueprint.');
  }
}
export function localProject(id: string) { const project = readLocal().projects.find(p => p.id === id); if (!project)
  throw new Error('Project not found.'); return project; }
export function localCreate(input: {
  name: string;
  description?: string;
}) {
  const data = readLocal();
  const now = new Date().toISOString();
  const project: Project = { id: crypto.randomUUID(), name: input.name, description: input.description ?? null, userId: null, createdAt: now, updatedAt: now };
  data.projects.unshift(project);
  writeLocal(data);
  return project;
}
export function localSave(id: string, plan: FloorPlan) { const data = readLocal(); const project = data.projects.find(p => p.id === id); if (!project)
  throw new Error('Project not found.'); data.plans[id] = plan; project.updatedAt = new Date().toISOString(); writeLocal(data); return plan; }
export async function localUpload(projectId: string, file: File): Promise<Blueprint> {
  localProject(projectId);
  if (file.size > 3 * 1024 * 1024)
    throw new Error('Local workspace accepts images up to 3 MB. Use server mode for larger files.');
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error('Could not read the file.')); reader.readAsDataURL(file); });
  const data = readLocal();
  const blueprint = { id: crypto.randomUUID(), projectId, originalFilename: file.name, mimeType: file.type, fileSizeBytes: file.size, processingStatus: 'pending' as const, uploadedAt: new Date().toISOString(), dataUrl };
  data.blueprints[projectId] = [blueprint];
  const project = data.projects.find(p => p.id === projectId);
  if (project)
    project.updatedAt = new Date().toISOString();
  writeLocal(data);
  return blueprint;
}
