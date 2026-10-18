import { pool } from '../../db/pool';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface Blueprint {
  id: string;
  projectId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  processingStatus: ProcessingStatus;
  uploadedAt: string;
}
interface BlueprintRow {
  id: string;
  project_id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  processing_status: ProcessingStatus;
  uploaded_at: string;
}
function mapRow(row: BlueprintRow): Blueprint {
  return {
    id: row.id,
    projectId: row.project_id,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    processingStatus: row.processing_status,
    uploadedAt: row.uploaded_at,
  };
}
export async function createBlueprint(input: {
  projectId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<Blueprint> {
  const result = await pool.query<BlueprintRow>(`INSERT INTO blueprints (project_id, original_filename, storage_path, mime_type, file_size_bytes)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *`, [input.projectId, input.originalFilename, input.storagePath, input.mimeType, input.fileSizeBytes]);
  return mapRow(result.rows[0]);
}
export async function listBlueprintsForProject(projectId: string): Promise<Blueprint[]> {
  const result = await pool.query<BlueprintRow>('SELECT * FROM blueprints WHERE project_id = $1 ORDER BY uploaded_at DESC', [projectId]);
  return result.rows.map(mapRow);
}
export async function getBlueprintById(projectId: string, blueprintId: string): Promise<(Blueprint & {
  storagePath: string;
}) | null> {
  const result = await pool.query<BlueprintRow>('SELECT * FROM blueprints WHERE id = $1 AND project_id = $2', [blueprintId, projectId]);
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return { ...mapRow(row), storagePath: row.storage_path };
}
export async function setBlueprintStatus(id: string, status: ProcessingStatus): Promise<void> {
  await pool.query('UPDATE blueprints SET processing_status = $1 WHERE id = $2', [status, id]);
}
