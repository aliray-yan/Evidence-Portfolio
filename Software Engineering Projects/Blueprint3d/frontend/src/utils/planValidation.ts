import type { FloorPlan, Point2D } from '../types/floorPlan';
import type { ValidationIssue } from '../api/floorPlans';
import { polygonArea } from './geometry2d';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const point = (v: unknown) => record(v) && finite(v.x) && finite(v.y);
const id = (v: unknown) => record(v) && typeof v.id === 'string' && v.id.length > 0;
const polygon = (v: unknown) => Array.isArray(v) && v.length >= 3 && v.every(point);
export function assertFloorPlan(v: unknown): asserts v is FloorPlan {
  if (!record(v) || v.schemaVersion !== 1 || !['m', 'cm', 'ft', 'in'].includes(String(v.unit)) || !record(v.metadata) ||
    !record(v.plot) || !finite(v.plot.width) || !finite(v.plot.length) || v.plot.width <= 0 || v.plot.length <= 0 || v.plot.width > 500 || v.plot.length > 500 ||
    !['walls', 'rooms', 'doors', 'windows', 'stairs', 'columns'].every(k => Array.isArray(v[k]) && v[k].length <= 2000))
    throw new Error('Invalid floor plan: use a version 1 Blueprint3D JSON file with a plot between 0 and 500 metres.');
  if ((v.metadata.confidence !== undefined && (!finite(v.metadata.confidence) || v.metadata.confidence < 0 || v.metadata.confidence > 1)) || (v.metadata.analysisNotes !== undefined && (!Array.isArray(v.metadata.analysisNotes) || !v.metadata.analysisNotes.every(n => typeof n === 'string'))))
    throw new Error('Invalid analysis metadata.');
  const plan = v as unknown as FloorPlan;
  if (!plan.walls.every(w => id(w) && point(w.start) && point(w.end) && finite(w.height) && finite(w.thickness) && ['interior', 'exterior'].includes(w.type)) ||
    !plan.rooms.every(r => id(r) && typeof r.name === 'string' && polygon(r.boundary)) ||
    ![...plan.doors, ...plan.windows].every(o => id(o) && typeof o.wallId === 'string' && finite(o.offset) && finite(o.width) && finite(o.height) && (o.sillHeight === undefined || finite(o.sillHeight))) ||
    !plan.stairs.every(s => id(s) && polygon(s.boundary) && finite(s.fromLevel) && finite(s.toLevel) && ['up', 'down'].includes(s.direction)) ||
    !plan.columns.every(c => id(c) && point(c.position) && finite(c.width) && finite(c.depth) && finite(c.height)))
    throw new Error('Invalid floor plan: one or more elements have missing or invalid dimensions.');
  const optionalColor=(value:unknown)=>value===undefined || typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
  const furniture=plan.furniture??[];
  if(!Array.isArray(furniture)||furniture.length>2000||!furniture.every(f=>id(f)&&point(f.position)&&typeof f.name==='string'&&['bed','sofa','table','chair','cabinet','wardrobe','toilet','basin','plant','car'].includes(f.kind)&&finite(f.width)&&finite(f.depth)&&finite(f.height)&&finite(f.rotation)&&optionalColor(f.color)&&(f.elevation===undefined||finite(f.elevation))))throw new Error('Invalid furniture geometry.');
  if(plan.plot.marlaSquareFeet!==undefined&&(!finite(plan.plot.marlaSquareFeet)||plan.plot.marlaSquareFeet<=0))throw new Error('Marla size must be positive square feet.');
  if(![...plan.walls,...plan.doors,...plan.windows,...plan.columns,...plan.stairs,...furniture].every(e=>optionalColor(e.color))||!plan.rooms.every(r=>optionalColor(r.floorColor)&&optionalColor(r.ceilingColor)&&(r.ceilingHeight===undefined||finite(r.ceilingHeight))))throw new Error('Invalid component color or ceiling height.');
  if(!plan.rooms.every(r=>r.declaredSize===undefined || finite(r.declaredSize.width)&&finite(r.declaredSize.length)&&r.declaredSize.width>0&&r.declaredSize.length>0&&typeof r.declaredSize.sourceText==='string'&&finite(r.declaredSize.confidence)))throw new Error('Invalid drawing dimensions.');
  if(plan.metadata.dimensions!==undefined&&(!Array.isArray(plan.metadata.dimensions)||!plan.metadata.dimensions.every(d=>id(d)&&typeof d.text==='string'&&finite(d.valueMeters)&&d.valueMeters>0&&finite(d.confidence)&&d.confidence>=0&&d.confidence<=1&&['x','y','room'].includes(d.axis)&&['review','confirmed'].includes(d.status)&&(d.lengthMeters===undefined||finite(d.lengthMeters)&&d.lengthMeters>0))))throw new Error('Invalid dimension readings.');
  if(![...plan.doors,...plan.windows].every(o=>optionalColor(o.frameColor)&&(o.openAngle===undefined||finite(o.openAngle))&&(o.swing===undefined||['left','right','none','sliding'].includes(o.swing))))throw new Error('Invalid opening style.');
  if(!plan.stairs.every(s=>(s.rotation===undefined||finite(s.rotation))&&(s.steps===undefined||finite(s.steps)&&s.steps>=3&&s.steps<=40)&&(s.height===undefined||finite(s.height)&&s.height>0)))throw new Error('Invalid staircase geometry.');
  const registration=plan.metadata.imageRegistration;if(registration&&(!['width','height','left','top','pixelsPerMeter'].every(k=>finite(registration[k as keyof typeof registration]))||registration.width<=0||registration.height<=0||registration.pixelsPerMeter<=0||registration.pixelsPerMeterY!==undefined&&(!finite(registration.pixelsPerMeterY)||registration.pixelsPerMeterY<=0)))throw new Error('Invalid reference image registration.');

  const ids = [...plan.walls, ...plan.rooms, ...plan.doors, ...plan.windows, ...plan.stairs, ...plan.columns,...furniture].map(e => e.id);
  if (new Set(ids).size !== ids.length)
    throw new Error('Invalid floor plan: element IDs must be unique.');
}
export function checkFloorPlan(plan: FloorPlan): ValidationIssue[] {
  try {
    assertFloorPlan(plan);
  }
  catch (error) {
    return [{ severity: 'error', code: 'invalid-document', message: (error as Error).message }];
  }
  const issues: ValidationIssue[] = [];
  const add = (code: string, message: string, elementId?: string, severity: 'error' | 'warning' = 'error') => issues.push({ code, message, elementId, severity });
  if (!plan.walls.length)
    add('empty-plan', 'Add walls to create your 3D model.', undefined, 'warning');
  for (const w of plan.walls) {
    if (Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) < 0.05 || w.thickness <= 0 || w.height <= 0)
      add('wall-dimensions', 'Wall length, thickness and height must be greater than zero.', w.id);
    if ([w.start, w.end].some(p => p.x < 0 || p.y < 0 || p.x > plan.plot.width || p.y > plan.plot.length))
      add('outside-plot', 'A wall extends beyond the plot.', w.id, 'warning');
  }
  for (const r of plan.rooms) {
    if (polygonArea(r.boundary) < 0.5)
      add('room-area', `${r.name} has a near-zero floor area.`, r.id);
    const side = (a: Point2D, b: Point2D, c: Point2D) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const n = r.boundary.length;
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1)
          continue;
        const a = r.boundary[i], b = r.boundary[(i + 1) % n], c = r.boundary[j], d = r.boundary[(j + 1) % n];
        if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0)
          add('crossed-boundary', `${r.name} has a boundary that crosses itself.`, r.id);
      }
  }
  for (const c of plan.columns) {
    if (c.width <= 0 || c.depth <= 0 || c.height <= 0)
      add('column-dimensions', 'Column dimensions must be greater than zero.', c.id);
  }
  if (plan.rooms.length && !plan.doors.length)
    add('no-doors', 'Add doors to connect your rooms before using Walk inside.', undefined, 'warning');
  const openings = [...plan.doors, ...plan.windows];
  for (const o of openings) {
    const w = plan.walls.find(w => w.id === o.wallId);
    if (!w) {
      add('orphan-opening', 'An opening belongs to a missing wall.', o.id);
      continue;
    }
    const sill = o.sillHeight ?? 0;
    if (o.width <= 0 || o.height <= 0 || sill < 0 || sill + o.height > w.height + 0.001 || o.offset < 0 || o.offset + o.width > Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) + 0.001)
      add('opening-dimensions', 'An opening extends beyond its wall, or has invalid dimensions.', o.id);
  }
  for (let i = 0; i < openings.length; i++)
    for (let j = i + 1; j < openings.length; j++) {
      const a = openings[i], b = openings[j];
      if (a.wallId === b.wallId && Math.max(a.offset, b.offset) < Math.min(a.offset + a.width, b.offset + b.width) && Math.max(a.sillHeight ?? 0, b.sillHeight ?? 0) < Math.min((a.sillHeight ?? 0) + a.height, (b.sillHeight ?? 0) + b.height))
        add('overlapping-openings', 'Two doors or windows overlap. Move one along the wall.', b.id);
    }
  for(const f of plan.furniture??[]){if(f.width<=0||f.depth<=0||f.height<=0)add('furniture-size','Furniture dimensions must be positive.',f.id);if(f.position.x<0||f.position.y<0||f.position.x>plan.plot.width||f.position.y>plan.plot.length)add('furniture-outside','An object is outside the plot.',f.id,'warning');}
  if (plan.stairs.length)
    add('stairs-levels', 'Stair flights are visualized; supply separate floor plans for upper levels.', undefined, 'warning');
  for(const r of plan.rooms){if(r.ceilingHeight!==undefined&&r.ceilingHeight<=0)add('ceiling-height','Ceiling height must be positive.',r.id);}
  return issues;
}
