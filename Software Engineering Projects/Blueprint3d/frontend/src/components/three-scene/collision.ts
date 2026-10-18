import type { FloorPlan, Opening } from '../../types/floorPlan';
import { wallLength } from './geometry';
export interface CollisionSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  halfThickness: number;
}
export interface Circle2D {
  x: number;
  z: number;
  radius: number;
}
export const PLAYER_RADIUS = 0.3;
// A sill this close to the floor might as well not be one — treat it as a
// floor-level opening, same as a door. A normal window (sill ~0.9m) keeps
// its solid sill as a real obstacle even though the glass above it isn't.
const PASSABLE_SILL_THRESHOLD = 0.05;
interface Span {
  offset: number;
  width: number;
}
/**
* Horizontal gaps only, no vertical splitting — collision only cares about
* "is there solid material at floor/waist height here," not the sill/lintel
* detail geometry.ts needs for rendering.
*/
function computeOpenSpans(length: number, openSpans: Span[]): {
  xStart: number;
  xEnd: number;
}[] {
  const sorted = [...openSpans].sort((a, b) => a.offset - b.offset);
  const solidSpans: {
    xStart: number;
    xEnd: number;
  }[] = [];
  let cursor = 0;
  for (const span of sorted) {
    const spanStart = Math.max(span.offset, 0);
    const spanEnd = Math.min(span.offset + span.width, length);
    if (spanEnd <= spanStart || spanStart < cursor) {
      continue;
    }
    if (spanStart > cursor) {
      solidSpans.push({ xStart: cursor, xEnd: spanStart });
    }
    cursor = spanEnd;
  }
  if (cursor < length) {
    solidSpans.push({ xStart: cursor, xEnd: length });
  }
  return solidSpans;
}
function isPassableAtFloor(opening: Opening): boolean {
  return (opening.sillHeight ?? 0) <= PASSABLE_SILL_THRESHOLD;
}
/**
* The walls a player actually collides with. Doors are always passable.
* Windows are passable only if their sill is effectively at floor level —
* a standard window still blocks movement, because the solid sill beneath
* the glass stops a walking person even though the opening above it
* doesn't.
*/
export function buildCollisionSegments(floorPlan: FloorPlan): CollisionSegment[] {
  const segments: CollisionSegment[] = [];
  for (const wall of floorPlan.walls) {
    const doors = floorPlan.doors.filter((door) => door.wallId === wall.id);
    const openWindows = floorPlan.windows.filter((win) => win.wallId === wall.id && isPassableAtFloor(win));
    const openSpans: Span[] = [...doors, ...openWindows].map((opening) => ({
      offset: opening.offset,
      width: opening.width,
    }));
    const length = wallLength(wall);
    const dx = (wall.end.x - wall.start.x) / length;
    const dz = (wall.end.y - wall.start.y) / length;
    for (const span of computeOpenSpans(length, openSpans)) {
      segments.push({
        ax: wall.start.x + dx * span.xStart,
        az: wall.start.y + dz * span.xStart,
        bx: wall.start.x + dx * span.xEnd,
        bz: wall.start.y + dz * span.xEnd,
        halfThickness: wall.thickness / 2,
      });
    }
  }
  return segments;
}
function closestPointOnSegment(px: number, pz: number, seg: CollisionSegment): {
  x: number;
  z: number;
} {
  const abx = seg.bx - seg.ax;
  const abz = seg.bz - seg.az;
  const lengthSq = abx * abx + abz * abz;
  if (lengthSq === 0) {
    return { x: seg.ax, z: seg.az };
  }
  const apx = px - seg.ax;
  const apz = pz - seg.az;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / lengthSq));
  return { x: seg.ax + t * abx, z: seg.az + t * abz };
}
/** Pushes a circle out of any wall segment it overlaps. Unaffected segments
* leave it untouched, so a position with no nearby walls is returned as-is. */
export function resolveCircleAgainstWalls(circle: Circle2D, segments: CollisionSegment[]): {
  x: number;
  z: number;
} {
  let x = circle.x;
  let z = circle.z;
  for (const seg of segments) {
    const closest = closestPointOnSegment(x, z, seg);
    const dx = x - closest.x;
    const dz = z - closest.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = seg.halfThickness + circle.radius;
    if (distance > 0 && distance < minDistance) {
      const overlap = minDistance - distance;
      x += (dx / distance) * overlap;
      z += (dz / distance) * overlap;
    }
  }
  return { x, z };
}
