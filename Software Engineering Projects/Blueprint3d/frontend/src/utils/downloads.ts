import type { FloorPlan } from '../types/floorPlan';
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function downloadPlan(plan: FloorPlan, name: string) { downloadBlob(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }), `${name.replace(/[^a-z0-9-]/gi, '-')}.json`); }
