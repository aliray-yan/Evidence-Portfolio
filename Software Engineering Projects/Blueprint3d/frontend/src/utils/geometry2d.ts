import type { Point2D } from '../types/floorPlan';
/** Shoelace formula. Works for any simple (non-self-intersecting) polygon. */
export function polygonArea(boundary: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < boundary.length; i++) {
    const current = boundary[i];
    const next = boundary[(i + 1) % boundary.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}
/** Bounding-box width/length — an approximation for non-rectangular rooms. */
export function polygonBounds(boundary: Point2D[]): {
  width: number;
  length: number;
} {
  const xs = boundary.map((point) => point.x);
  const ys = boundary.map((point) => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    length: Math.max(...ys) - Math.min(...ys),
  };
}
export function polygonCentroid(boundary: Point2D[]): Point2D {
  const x = boundary.reduce((sum, point) => sum + point.x, 0) / boundary.length;
  const y = boundary.reduce((sum, point) => sum + point.y, 0) / boundary.length;
  return { x, y };
}
export function pointInPolygon(p: Point2D, boundary: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i], b = boundary[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
/** Concave rooms can have their centroid outside the floor. Find a safe interior sample. */
export function roomInteriorPoint(boundary: Point2D[]): Point2D {
  const c = polygonCentroid(boundary);
  if (pointInPolygon(c, boundary))
    return c;
  const xs = boundary.map(p => p.x), ys = boundary.map(p => p.y), minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  for (let y = 1; y < 20; y++)
    for (let x = 1; x < 20; x++) {
      const p = { x: minX + width * x / 20, y: minY + height * y / 20 };
      if (pointInPolygon(p, boundary))
        return p;
    }
  return boundary[0] ?? { x: 0, y: 0 };
}
export function roomViewPoint(boundary: Point2D[]): Point2D {
  const xs = boundary.map(p => p.x), ys = boundary.map(p => p.y);
  const candidate = { x: Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * .78, y: Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * .8 };
  return pointInPolygon(candidate, boundary) ? candidate : roomInteriorPoint(boundary);
}
