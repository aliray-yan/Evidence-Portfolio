import assert from 'node:assert/strict';
import { createApp } from '../backend/src/app';
import { pool } from '../backend/src/db/pool';
const originalQuery = pool.query;
const id = '00000000-0000-0000-0000-000000000001';
const date = new Date().toISOString();
(pool as unknown as {
  query: (q: string, params?: unknown[]) => Promise<unknown>;
}).query = async (q: string) => ({ rows: q.includes('SELECT * FROM projects') ? [{ id, user_id: null, name: 'Test house', description: null, created_at: date, updated_at: date }] : [], rowCount: 0 });
const server = createApp().listen(0, '127.0.0.1');
await new Promise<void>(r => server.once('listening', r));
const address = server.address();
if (!address || typeof address === 'string')
  throw new Error('No test server port');
const base = 'http://127.0.0.1:' + address.port;
try {
  assert.equal((await fetch(base + '/api/projects/invalid')).status, 400);
  const path = base + '/api/projects/' + id + '/floor-plan';
  assert.equal((await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plot: { width: 10, length: 10 }, walls: [null], rooms: [], doors: [], windows: [], stairs: [], columns: [], unit: 'm', schemaVersion: 1, metadata: {} }) })).status, 400);
  assert.equal((await fetch(path + '/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"not":"a plan"}' })).status, 400);
  assert.equal((await fetch(base + '/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"broken"' })).status, 400);
  assert.equal((await fetch(base+'/api/analysis/health')).status,200);
  assert.equal((await fetch(base+'/api/analysis/image',{method:'POST'})).status,400);
  const upload=new FormData();upload.append('blueprint',new Blob(['not an image']), 'plan.png');
  assert.equal((await fetch(base+'/api/analysis/image',{method:'POST',body:upload})).status,415);
  console.log('PASS API: malformed IDs, malformed geometry, invalid validation body, invalid JSON. Database queries isolated with a test stub.');
}
finally {
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  pool.query = originalQuery;
  await pool.end();
}
