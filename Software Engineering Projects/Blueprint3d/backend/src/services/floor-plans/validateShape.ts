const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const point = (v: unknown) => record(v) && finite(v.x) && finite(v.y);
const element = (v: unknown): v is Record<string, unknown> => record(v) && typeof v.id === 'string' && v.id.length > 0;
const polygon = (v: unknown) => Array.isArray(v) && v.length >= 3 && v.every(point);
export function isValidFloorPlanShape(v: unknown): v is Record<string, unknown> {
  if (!record(v) || v.schemaVersion !== 1 || !['m', 'cm', 'ft', 'in'].includes(String(v.unit)) || !record(v.metadata) || !record(v.plot) || !finite(v.plot.width) || !finite(v.plot.length) || v.plot.width <= 0 || v.plot.length <= 0 || v.plot.width > 500 || v.plot.length > 500)
    return false;
  if ((v.metadata.confidence !== undefined && (!finite(v.metadata.confidence) || v.metadata.confidence < 0 || v.metadata.confidence > 1)) || (v.metadata.analysisNotes !== undefined && (!Array.isArray(v.metadata.analysisNotes) || !v.metadata.analysisNotes.every(n => typeof n === 'string'))))
    return false;
  const keys = ['walls', 'rooms', 'doors', 'windows', 'stairs', 'columns'];
  if (!keys.every(k => Array.isArray(v[k]) && v[k].length <= 2000))
    return false;
  const walls = v.walls as unknown[], rooms = v.rooms as unknown[], doors = v.doors as unknown[], windows = v.windows as unknown[], stairs = v.stairs as unknown[], columns = v.columns as unknown[];
  if (!walls.every(w => element(w) && point(w.start) && point(w.end) && finite(w.height) && finite(w.thickness) && ['interior', 'exterior'].includes(String(w.type))) ||
    !rooms.every(r => element(r) && typeof r.name === 'string' && polygon(r.boundary)) ||
    ![...doors, ...windows].every(o => element(o) && typeof o.wallId === 'string' && finite(o.offset) && finite(o.width) && finite(o.height) && (o.sillHeight === undefined || finite(o.sillHeight))) ||
    !stairs.every(s => element(s) && polygon(s.boundary) && finite(s.fromLevel) && finite(s.toLevel) && ['up', 'down'].includes(String(s.direction))) ||
    !columns.every(c => element(c) && point(c.position) && finite(c.width) && finite(c.depth) && finite(c.height)))
    return false;
  const furniture=v.furniture??[];
  const color=(c:unknown)=>c===undefined || typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
  if(!Array.isArray(furniture)||furniture.length>2000||!furniture.every(f=>element(f)&&point(f.position)&&typeof f.name==='string'&&['bed','sofa','table','chair','cabinet','wardrobe','toilet','basin','plant','car'].includes(String(f.kind))&&finite(f.width)&&finite(f.depth)&&finite(f.height)&&finite(f.rotation)&&color(f.color)&&(f.elevation===undefined||finite(f.elevation))))return false;
  if(v.plot.marlaSquareFeet!==undefined&&(!finite(v.plot.marlaSquareFeet)||v.plot.marlaSquareFeet<=0))return false;
  if(![...walls,...doors,...windows,...columns,...stairs,...furniture].every(e=>color((e as Record<string,unknown>).color)))return false;

  if(!rooms.every(r=>{const room=r as Record<string,unknown>;const declared=room.declaredSize;return color(room.floorColor)&&color(room.ceilingColor)&&(room.ceilingHeight===undefined||finite(room.ceilingHeight))&&(declared===undefined||record(declared)&&finite(declared.width)&&finite(declared.length)&&declared.width>0&&declared.length>0&&typeof declared.sourceText==='string'&&finite(declared.confidence));}))return false;
  if(![...doors,...windows].every(o=>{const opening=o as Record<string,unknown>;return color(opening.frameColor)&&(opening.openAngle===undefined||finite(opening.openAngle))&&(opening.swing===undefined||['left','right','none','sliding'].includes(String(opening.swing)));}))return false;
  if(!stairs.every(s=>{const stair=s as Record<string,unknown>;return (stair.rotation===undefined||finite(stair.rotation))&&(stair.height===undefined||finite(stair.height)&&stair.height>0)&&(stair.steps===undefined||finite(stair.steps)&&stair.steps>=3&&stair.steps<=40);}))return false;
  const registration=v.metadata.imageRegistration;
  if(registration!==undefined&&(!record(registration)||!['width','height','left','top','pixelsPerMeter'].every(k=>finite(registration[k]))||Number(registration.width)<=0||Number(registration.height)<=0||Number(registration.pixelsPerMeter)<=0||registration.pixelsPerMeterY!==undefined&&(!finite(registration.pixelsPerMeterY)||registration.pixelsPerMeterY<=0)))return false;

  const ids = [...walls, ...rooms, ...doors, ...windows, ...stairs, ...columns,...furniture].map(e => (e as Record<string, unknown>).id);
  return new Set(ids).size === ids.length;
}
