import { pool } from '../../db/pool';
export interface Project {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
interface ProjectRow {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export async function listProjects(): Promise<Project[]> {
  const result = await pool.query<ProjectRow>('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows.map(mapRow);
}
export async function createProject(input: {
  name: string;
  description?: string | null;
}): Promise<Project> {
  const result = await pool.query<ProjectRow>('INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *', [input.name, input.description ?? null]);
  return mapRow(result.rows[0]);
}
export async function getProjectById(id: string): Promise<Project | null> {
  const result = await pool.query<ProjectRow>('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
export async function updateProject(id: string, input: {
  name?: string;
  description?: string | null;
}): Promise<Project | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  if (input.name !== undefined) {
    paramIndex += 1;
    sets.push(`name = $${paramIndex}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    paramIndex += 1;
    sets.push(`description = $${paramIndex}`);
    values.push(input.description);
  }
  if (sets.length === 0) {
    return getProjectById(id);
  }
  const result = await pool.query<ProjectRow>(`UPDATE projects SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, [id, ...values]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
export async function deleteProject(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
