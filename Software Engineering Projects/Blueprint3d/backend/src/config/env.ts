import 'dotenv/config';
export interface AppEnv {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  corsOrigin: string;
  maxUploadSizeBytes: number;
}
/** Numeric env vars fall back to their default on anything that doesn't
* parse cleanly, rather than silently becoming NaN and quietly breaking
* whatever reads them (e.g. multer's fileSize limit). */
function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback;
}
export const env: AppEnv = {
  port: numberFromEnv(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ??
    'postgresql://blueprint3d:blueprint3d@localhost:5432/blueprint3d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  maxUploadSizeBytes: numberFromEnv(process.env.MAX_UPLOAD_SIZE_MB, 20) * 1024 * 1024,
};
