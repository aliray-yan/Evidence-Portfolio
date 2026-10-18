export interface MaterialDefinition {
  color: string;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}
// Mirrors the seed data in docs/DATABASE_SCHEMA.md — kept as a small static
// registry per docs/3D_GENERATION.md ("do not overcomplicate the first
// version"), not a full PBR texture system.
export const MATERIAL_REGISTRY: Record<string, MaterialDefinition> = {
  concrete: { color: '#9a9a92', roughness: 0.9, metalness: 0.05 },
  'painted-wall': { color: '#f2efe9', roughness: 0.85 },
  brick: { color: '#a4543a', roughness: 0.95 },
  wood: { color: '#bf9870', roughness: 0.72 },
  tile: { color: '#d9d4c9', roughness: 0.3 },
  glass: { color: '#bcd9e6', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 },
  metal: { color: '#8d8f92', roughness: 0.35, metalness: 0.8 },
};
const FALLBACK: MaterialDefinition = MATERIAL_REGISTRY['painted-wall'];
export function getMaterial(key: string | undefined): MaterialDefinition {
  if (key && MATERIAL_REGISTRY[key]) {
    return MATERIAL_REGISTRY[key];
  }
  return FALLBACK;
}
