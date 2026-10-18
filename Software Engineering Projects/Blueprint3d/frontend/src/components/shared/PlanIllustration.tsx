import type { FloorPlan } from '../../types/floorPlan';
import { polygonCentroid } from '../../utils/geometry2d';
export function PlanIllustration({ plan, isometric = false }: {
  plan: FloorPlan;
  isometric?: boolean;
}) {
  const scale = 25;
  const project = (x: number, y: number, h = 0) => isometric ? `${260 + (x - y) * 17},${55 + (x + y) * 8.5 - h * 22}` : `${30 + x * scale},${30 + y * scale}`;
  return <svg viewBox={isometric ? '0 0 520 360' : `0 0 ${plan.plot.width * scale + 60} ${plan.plot.length * scale + 60}`} role="img" aria-label={isometric ? 'Isometric house illustration' : '2D floor plan preview'}>
  {isometric && <ellipse cx="260" cy="305" rx="185" ry="24" fill="#103e32" opacity=".07"/>}
  {plan.rooms.map((r, i) => <polygon key={r.id} points={r.boundary.map(p => project(p.x, p.y)).join(' ')} fill={['#d9e7dc', '#efe6d5', '#e5ddce', '#d4e2e5', '#e2dfd7', '#e5d5c4'][i % 6]} stroke="#fff" strokeWidth={isometric ? 2 : 1}/>)}
  {plan.walls.map(w => isometric ? <g key={w.id}><polygon points={[project(w.start.x, w.start.y), project(w.end.x, w.end.y), project(w.end.x, w.end.y, 1.1), project(w.start.x, w.start.y, 1.1)].join(' ')} fill={w.start.x === w.end.x ? '#bdc9bd' : '#f5f3e8'} stroke="#879d90" strokeWidth=".8"/><path d={`M${project(w.start.x, w.start.y, 1.1)} L${project(w.end.x, w.end.y, 1.1)}`} stroke="#fdfdf8" strokeWidth="3"/></g> : <line key={w.id} x1={30 + w.start.x * scale} y1={30 + w.start.y * scale} x2={30 + w.end.x * scale} y2={30 + w.end.y * scale} stroke="#284c42" strokeWidth={w.thickness * scale}/>)}
  {!isometric && plan.rooms.map(r => { const c = polygonCentroid(r.boundary); return <text key={r.id} x={30 + c.x * scale} y={30 + c.y * scale} fill="#426057" fontSize="8" textAnchor="middle">{r.name}</text>; })}
  {!isometric && [...plan.doors, ...plan.windows].map(o => { const w = plan.walls.find(w => w.id === o.wallId)!; const l = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y); const dx = (w.end.x - w.start.x) / l, dy = (w.end.y - w.start.y) / l; return <line key={o.id} x1={30 + (w.start.x + dx * o.offset) * scale} y1={30 + (w.start.y + dy * o.offset) * scale} x2={30 + (w.start.x + dx * (o.offset + o.width)) * scale} y2={30 + (w.start.y + dy * (o.offset + o.width)) * scale} stroke={plan.doors.includes(o) ? '#d78e61' : '#60a8b1'} strokeWidth="4"/>; })}
 </svg>;
}
