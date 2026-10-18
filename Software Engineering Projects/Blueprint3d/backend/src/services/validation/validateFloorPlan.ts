interface Point2D {
  x: number;
  y: number;
}
interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number;
  height: number;
  type: string;
}
interface Room {
  id: string;
  name: string;
  boundary: Point2D[];
}
interface Opening {
  id: string;
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
}
interface FloorPlanLike {
  plot?: {
    width?: number;
    length?: number;
  };
  walls?: Wall[];
  rooms?: Room[];
  doors?: Opening[];
  windows?: Opening[];
}
export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  elementId?: string;
}
const ENDPOINT_TOLERANCE = 0.05; // meters — how close two points must be to count as "the same corner"
const MIN_ROOM_AREA = 0.5; // square meters
function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function polygonArea(boundary: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < boundary.length; i++) {
    const current = boundary[i];
    const next = boundary[(i + 1) % boundary.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}
/**
* Domain-level checks (Step 13 of the spec) — distinct from
* isValidFloorPlanShape's envelope check in floorPlanRepository, which
* only confirms the document has the right top-level shape. This assumes
* that check already passed and looks at whether the *content* makes
* sense: closed boundaries, non-degenerate dimensions, openings that
* still belong to a real wall. Computed on demand, matching
* docs/API_DESIGN.md — never persisted, so it can't go stale relative to
* the plan it's validating.
*/
export function validateFloorPlan(floorPlan: FloorPlanLike): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const walls = floorPlan.walls ?? [];
  const rooms = floorPlan.rooms ?? [];
  const doors = floorPlan.doors ?? [];
  const windows = floorPlan.windows ?? [];
  if (!floorPlan.plot || !(floorPlan.plot.width! > 0) || !(floorPlan.plot.length! > 0)) {
    issues.push({
      severity: 'error',
      code: 'plot-dimensions-missing',
      message: 'Plot width and length must both be greater than zero.',
    });
  }
  for (const wall of walls) {
    if (distance(wall.start, wall.end) < ENDPOINT_TOLERANCE) {
      issues.push({
        severity: 'error',
        code: 'wall-zero-length',
        message: 'A wall has an impossible length — its start and end points are the same.',
        elementId: wall.id,
      });
    }
    if (!(wall.thickness > 0)) {
      issues.push({
        severity: 'error',
        code: 'wall-invalid-thickness',
        message: 'A wall has zero or negative thickness.',
        elementId: wall.id,
      });
    }
    if (!(wall.height > 0)) {
      issues.push({
        severity: 'error',
        code: 'wall-invalid-height',
        message: 'A wall has zero or negative height.',
        elementId: wall.id,
      });
    }
  }
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i];
      const b = walls[j];
      const sameDirection = distance(a.start, b.start) < ENDPOINT_TOLERANCE &&
        distance(a.end, b.end) < ENDPOINT_TOLERANCE;
      const reversed = distance(a.start, b.end) < ENDPOINT_TOLERANCE &&
        distance(a.end, b.start) < ENDPOINT_TOLERANCE;
      if (sameDirection || reversed) {
        issues.push({
          severity: 'warning',
          code: 'walls-overlapping',
          message: 'Two walls occupy the same position — likely a duplicate.',
          elementId: b.id,
        });
      }
    }
  }
  const exteriorWalls = walls.filter((wall) => wall.type === 'exterior');
  if (exteriorWalls.length > 0) {
    const endpoints = exteriorWalls.flatMap((wall) => [wall.start, wall.end]);
    for (const wall of exteriorWalls) {
      for (const point of [wall.start, wall.end]) {
        const matches = endpoints.filter((candidate) => distance(candidate, point) < ENDPOINT_TOLERANCE);
        if (matches.length < 2) {
          issues.push({
            severity: 'warning',
            code: 'exterior-boundary-open',
            message: 'Exterior boundary is not closed — a wall endpoint has no neighbor.',
            elementId: wall.id,
          });
        }
      }
    }
  }
  for (const room of rooms) {
    if (!room.boundary || room.boundary.length < 3) {
      issues.push({
        severity: 'error',
        code: 'room-invalid-boundary',
        message: `"${room.name}" doesn't have enough points to form a room.`,
        elementId: room.id,
      });
      continue;
    }
    if (polygonArea(room.boundary) < MIN_ROOM_AREA) {
      issues.push({
        severity: 'error',
        code: 'room-degenerate-geometry',
        message: `"${room.name}" has an invalid or near-zero area.`,
        elementId: room.id,
      });
    }
    // Rooms and walls aren't topologically linked in this schema (see
    // docs/FLOORPLAN_SCHEMA.md), so "does this room have a door" is
    // necessarily approximate: does any door's wall touch this room's
    // boundary at all, corner-to-corner.
    const hasNearbyDoor = doors.some((door) => {
      const wall = walls.find((candidate) => candidate.id === door.wallId);
      if (!wall) {
        return false;
      }
      return room.boundary.some((point) => distance(point, wall.start) < 1 || distance(point, wall.end) < 1);
    });
    if (!hasNearbyDoor) {
      issues.push({
        severity: 'warning',
        code: 'room-no-door',
        message: `"${room.name}" has no detected door.`,
        elementId: room.id,
      });
    }
  }
  const allOpenings = [...doors, ...windows];
  for (let i = 0; i < allOpenings.length; i++)
    for (let j = i + 1; j < allOpenings.length; j++) {
      const a = allOpenings[i], b = allOpenings[j];
      if (a.wallId === b.wallId && Math.max(a.offset, b.offset) < Math.min(a.offset + a.width, b.offset + b.width) && Math.max(a.sillHeight ?? 0, b.sillHeight ?? 0) < Math.min((a.sillHeight ?? 0) + a.height, (b.sillHeight ?? 0) + b.height))
        issues.push({ severity: 'error', code: 'overlapping-openings', message: 'Two doors or windows overlap. Move one along the wall.', elementId: b.id });
    }
  for (const opening of allOpenings) {
    const wall = walls.find((candidate) => candidate.id === opening.wallId);
    if (!wall) {
      issues.push({
        severity: 'error',
        code: 'opening-orphaned',
        message: 'A door or window references a wall that no longer exists.',
        elementId: opening.id,
      });
      continue;
    }
    if ((opening.sillHeight ?? 0) < 0 || (opening.sillHeight ?? 0) + opening.height > wall.height + 0.001)
      issues.push({ severity: 'error', code: 'opening-height', message: 'An opening extends vertically beyond its wall.', elementId: opening.id });
    const wallLength = distance(wall.start, wall.end);
    if (opening.offset < 0 || opening.offset + opening.width > wallLength + ENDPOINT_TOLERANCE) {
      issues.push({
        severity: 'error',
        code: 'opening-out-of-bounds',
        message: 'A door or window extends past the end of its wall.',
        elementId: opening.id,
      });
    }
    if (!(opening.width > 0) || !(opening.height > 0)) {
      issues.push({
        severity: 'error',
        code: 'opening-invalid-dimensions',
        message: 'A door or window has a zero or negative width or height.',
        elementId: opening.id,
      });
    }
  }
  return issues;
}
