import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Resolved relative to the process cwd, which is always `backend/` per the
// documented `npm run dev` / `npm start` usage.
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};
export async function saveBlueprintFile(buffer: Buffer, mimeType: string): Promise<{
  storagePath: string;
}> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? '';
  const storagePath = path.join(UPLOADS_DIR, `${randomUUID()}${extension}`);
  await writeFile(storagePath, buffer);
  return { storagePath };
}
export async function readBlueprintFile(storagePath: string): Promise<Buffer> {
  return readFile(storagePath);
}
