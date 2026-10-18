import { pool } from '../../db/pool';
export interface Material {
  id: string;
  key: string;
  label: string;
  category: string;
  color: string | null;
  textureUrl: string | null;
  isDefault: boolean;
}
interface MaterialRow {
  id: string;
  key: string;
  label: string;
  category: string;
  color: string | null;
  texture_url: string | null;
  is_default: boolean;
}
function mapRow(row: MaterialRow): Material {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    category: row.category,
    color: row.color,
    textureUrl: row.texture_url,
    isDefault: row.is_default,
  };
}
export async function listMaterials(): Promise<Material[]> {
  const result = await pool.query<MaterialRow>('SELECT * FROM materials ORDER BY category, label');
  return result.rows.map(mapRow);
}
