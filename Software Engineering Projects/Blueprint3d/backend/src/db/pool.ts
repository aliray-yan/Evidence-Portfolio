import { Pool } from 'pg';
import { env } from '../config/env';
export const pool = new Pool({ connectionString: env.databaseUrl, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
pool.on('error', error => console.error('Database connection error:', error.message));
export type DatabaseStatus = 'connected' | 'unavailable';
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  try {
    await pool.query('SELECT 1');
    return 'connected';
  }
  catch (error) {
    console.error('Database health check failed:', error);
    return 'unavailable';
  }
}
