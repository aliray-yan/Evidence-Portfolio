import { apiFetch } from './request';
import { API_BASE_URL, LOCAL_MODE } from './config';
import { MATERIAL_REGISTRY } from '../components/three-scene/materials';
export interface Material {
  id: string;
  key: string;
  label: string;
  category: string;
  color: string | null;
  textureUrl: string | null;
  isDefault: boolean;
}
export async function listMaterials(): Promise<Material[]> {
  if (LOCAL_MODE)
    return Object.entries(MATERIAL_REGISTRY).map(([key, value]) => ({ id: key, key, label: key.replace('-', ' '), category: 'finish', color: value.color, textureUrl: null, isDefault: false }));
  const response = await apiFetch(`${API_BASE_URL}/api/materials`);
  if (!response.ok) {
    throw new Error(`Failed to load materials (${response.status})`);
  }
  return response.json() as Promise<Material[]>;
}
