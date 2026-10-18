import type { FloorPlan, Point2D, Wall } from '../types/floorPlan';
type Line = {
  axis: number;
  start: number;
  end: number;
  direction: 'h' | 'v';
};
/** Conservative line extraction for clear, axis-aligned raster plans.
* Joins small symbol gaps; users must review all inferred walls and add openings.
* No sample recognition or hidden prebuilt geometry is used here.
*/
export function extractRasterPlan(pixels: Uint8ClampedArray, width: number, height: number, knownWidth?: number): FloorPlan {
  if (width < 100 || height < 100)
    throw new Error('Use a larger, clearer floor-plan image.');
  const dark = new Uint8Array(width * height);
  for (let i = 0; i < dark.length; i++) {
    const a = pixels[i * 4 + 3] / 255;
    const gray = (pixels[i * 4] * .299 + pixels[i * 4 + 1] * .587 + pixels[i * 4 + 2] * .114) * a + 255 * (1 - a);
    dark[i] = gray < 105 ? 1 : 0;
  }
  const span = Math.max(width, height), minRun = Math.max(35, span * .045);
  const lines: Line[] = [];
  function scan(direction: 'h' | 'v') { const outer = direction === 'h' ? height : width, inner = direction === 'h' ? width : height; for (let a = 0; a < outer; a++) {
    let start = -1;
    for (let b = 0; b <= inner; b++) {
      const ink = b < inner && dark[direction === 'h' ? a * width + b : b * width + a];
      if (ink && start < 0)
        start = b;
      if (!ink && start >= 0) {
        if (b - start >= minRun)
          lines.push({ axis: a, start, end: b - 1, direction });
        start = -1;
      }
    }
  } }
  scan('h');
  scan('v');
  if (lines.length > 50000)
    throw new Error('The drawing is too dense. Crop to a single floor and use clearer walls.');
  const candidates: Line[] = [];
  for (const line of lines.sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
    const duplicate = candidates.find(c => c.direction === line.direction && Math.abs(c.axis - line.axis) < span * .013 && Math.min(c.end, line.end) - Math.max(c.start, line.start) > .6 * Math.min(c.end - c.start, line.end - line.start));
    if (!duplicate)
      candidates.push({ ...line });
  }
  // Join collinear pieces split by doors/window symbols, but retain remote walls.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < candidates.length; i++)
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i], b = candidates[j];
        if (a.direction === b.direction && Math.abs(a.axis - b.axis) < span * .015 && Math.max(a.start, b.start) - Math.min(a.end, b.end) < span * .16) {
          a.axis = (a.axis + b.axis) / 2;
          a.start = Math.min(a.start, b.start);
          a.end = Math.max(a.end, b.end);
          candidates.splice(j, 1);
          changed = true;
          break outer;
        }
      }
  }
  const kept = candidates.filter(c => c.end - c.start > span * .09);
  // Bridge short erased tails to the nearest perpendicular junction.
  for (const line of kept) {
    const crossing = kept.filter(c => c.direction !== line.direction && line.axis >= c.start - span * .02 && line.axis <= c.end + span * .02).map(c => c.axis);
    for (const end of ['start', 'end'] as const) {
      const nearby = crossing.filter(axis => Math.abs(axis - line[end]) < span * .16).sort((a, b) => Math.abs(a - line[end]) - Math.abs(b - line[end]));
      if (nearby.length)
        line[end] = nearby[0];
    }
  }
  if (kept.length < 4)
    throw new Error('No clear house outline found. Use a straight image with dark walls, or trace it in the editor.');
  if (kept.length > 100)
    throw new Error('Too many lines were detected. Crop out furniture, annotations and extra floors.');
  const rawPoints = kept.flatMap(l => l.direction === 'h' ? [{ x: l.start, y: l.axis }, { x: l.end, y: l.axis }] : [{ x: l.axis, y: l.start }, { x: l.axis, y: l.end }]);
  const minX = Math.min(...rawPoints.map(p => p.x)), minY = Math.min(...rawPoints.map(p => p.y)), maxX = Math.max(...rawPoints.map(p => p.x)), maxY = Math.max(...rawPoints.map(p => p.y));
  const scale = knownWidth ? (maxX - minX) / knownWidth : Math.max(maxX - minX, maxY - minY) / 12;
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error('The detected scale is invalid.');
  const plot = { width: (maxX - minX) / scale, length: (maxY - minY) / scale };
  const tolerance = span * .022 / scale;
  function clusters(values: number[]) { const sorted = values.sort((a, b) => a - b), groups: number[][] = []; for (const v of sorted) {
    const last = groups.at(-1);
    if (last && v - last[0] < tolerance)
      last.push(v);
    else
      groups.push([v]);
  } return groups.map(g => g.reduce((s, v) => s + v, 0) / g.length); }
  const xs = clusters(rawPoints.map(p => (p.x - minX) / scale)), ys = clusters(rawPoints.map(p => (p.y - minY) / scale));
  xs[0] = 0;
  xs[xs.length - 1] = plot.width;
  ys[0] = 0;
  ys[ys.length - 1] = plot.length;
  const nearest = (v: number, values: number[]) => values.reduce((best, n) => Math.abs(n - v) < Math.abs(best - v) ? n : best);
  const walls: Wall[] = kept.map<Wall>((line, index) => { const a = line.direction === 'h' ? { x: line.start, y: line.axis } : { x: line.axis, y: line.start }, b = line.direction === 'h' ? { x: line.end, y: line.axis } : { x: line.axis, y: line.end }; const start = { x: nearest((a.x - minX) / scale, xs), y: nearest((a.y - minY) / scale, ys) }, end = { x: nearest((b.x - minX) / scale, xs), y: nearest((b.y - minY) / scale, ys) }; return { id: 'wall-' + index, start, end, thickness: .18, height: 2.8, type: (start.x === 0 && end.x === 0) || (start.y === 0 && end.y === 0) || (start.x === plot.width && end.x === plot.width) || (start.y === plot.length && end.y === plot.length) ? 'exterior' : 'interior', materialKey: 'painted-wall' }; }).filter(w => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) > .15);
  // Partition a grid using detected wall axes, then join cells across absent dividers.
  if (xs.length > 35 || ys.length > 35)
    throw new Error('This plan is too complex for local analysis. Use server mode or trace the plan.');
  const cols = xs.length - 1, rows = ys.length - 1;
  const visited = new Set<number>(), rooms: FloorPlan['rooms'] = [];
  const blocked = (c: number, d: number) => walls.some(w => { const a = center(c), b = center(d); const x = a.y === b.y ? xs[Math.max(c % cols, d % cols)] : a.x, y = a.x === b.x ? ys[Math.max(Math.floor(c / cols), Math.floor(d / cols))] : a.y; if (w.start.x === w.end.x)
    return Math.abs(w.start.x - x) < tolerance * .1 && y >= Math.min(w.start.y, w.end.y) - .01 && y <= Math.max(w.start.y, w.end.y) + .01; return Math.abs(w.start.y - y) < tolerance * .1 && x >= Math.min(w.start.x, w.end.x) - .01 && x <= Math.max(w.start.x, w.end.x) + .01; });
  const center = (n: number) => ({ x: (xs[n % cols] + xs[n % cols + 1]) / 2, y: (ys[Math.floor(n / cols)] + ys[Math.floor(n / cols) + 1]) / 2 });
  for (let n = 0; n < cols * rows; n++) {
    if (visited.has(n))
      continue;
    const cells = [n];
    visited.add(n);
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i], x = c % cols, y = Math.floor(c / cols);
      for (const next of [x > 0 ? c - 1 : -1, x < cols - 1 ? c + 1 : -1, y > 0 ? c - cols : -1, y < rows - 1 ? c + cols : -1]) {
        if (next < 0 || visited.has(next) || blocked(c, next))
          continue;
        visited.add(next);
        cells.push(next);
      }
    }
    const edges = new Map<string, [
      Point2D,
      Point2D
    ]>();
    const key = (a: Point2D, b: Point2D) => [a, b].map(p => p.x.toFixed(4) + ',' + p.y.toFixed(4)).sort().join('|');
    for (const c of cells) {
      const x = c % cols, y = Math.floor(c / cols), corners = [{ x: xs[x], y: ys[y] }, { x: xs[x + 1], y: ys[y] }, { x: xs[x + 1], y: ys[y + 1] }, { x: xs[x], y: ys[y + 1] }];
      for (let i = 0; i < 4; i++) {
        const a = corners[i], b = corners[(i + 1) % 4], k = key(a, b);
        if (edges.has(k))
          edges.delete(k);
        else
          edges.set(k, [a, b]);
      }
    }
    const remaining = [...edges.values()];
    if (!remaining.length)
      continue;
    const first = remaining.shift()!, boundary: Point2D[] = [first[0], first[1]];
    let closed = false;
    while (remaining.length) {
      const end = boundary.at(-1)!;
      const i = remaining.findIndex(e => Math.abs(e[0].x - end.x) < .001 && Math.abs(e[0].y - end.y) < .001);
      if (i < 0)
        break;
      const e = remaining.splice(i, 1)[0];
      if (Math.abs(e[1].x - boundary[0].x) < .001 && Math.abs(e[1].y - boundary[0].y) < .001) {
        closed = true;
        break;
      }
      boundary.push(e[1]);
    }
    // Reject regions with holes/disjoint rings instead of silently filling them.
    if (!closed || remaining.length)
      continue;
    const area = Math.abs(boundary.reduce((sum, p, i) => { const q = boundary[(i + 1) % boundary.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
    if (area > .5)
      rooms.push({ id: 'room-' + rooms.length, name: 'Room ' + (rooms.length + 1), boundary, floorMaterialKey: 'wood' });
  }
  return { schemaVersion: 1, unit: 'm', plot, walls, rooms, doors: [], windows: [], stairs: [], columns: [], metadata: { confidence: knownWidth ? .75 : .25, analysisNotes: ['Local analysis estimates straight walls and room boundaries.', 'Door/window gaps were joined. Add openings and verify every inferred wall.', 'Room names are placeholders. ' + (knownWidth ? 'Scale uses your known plot width.' : 'Scale assumes the longest side is 12 m; calibrate before use.')] } };
}
