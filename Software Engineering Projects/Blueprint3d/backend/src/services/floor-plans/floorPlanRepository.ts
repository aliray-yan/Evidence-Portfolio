import { pool } from '../../db/pool';
export async function getFloorPlanByProjectId(projectId: string): Promise<unknown | null> {
  const result = await pool.query<{
    data: unknown;
  }>('SELECT data FROM floor_plans WHERE project_id = $1', [projectId]);
  return result.rows[0]?.data ?? null;
}
export async function upsertFloorPlan(projectId: string, data: Record<string, unknown>): Promise<unknown> {
  const plot = data.plot as {
    width: number;
    length: number;
  };
  const result = await pool.query<{
    data: unknown;
  }>(`INSERT INTO floor_plans (project_id, schema_version, unit, plot_width, plot_length, data)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (project_id)
  DO UPDATE SET
   schema_version = EXCLUDED.schema_version,
   unit = EXCLUDED.unit,
   plot_width = EXCLUDED.plot_width,
   plot_length = EXCLUDED.plot_length,
   data = EXCLUDED.data
  RETURNING data`, [
    projectId,
    typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
    data.unit,
    plot.width,
    plot.length,
    JSON.stringify(data),
  ]);
  return result.rows[0].data;
}
