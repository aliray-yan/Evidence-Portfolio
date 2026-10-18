import * as THREE from 'three';
import type { FloorPlan, Point2D, Wall } from '../../types/floorPlan';
export interface WallTransform {
  position: [
    number,
    number,
    number
  ];
  rotationY: number;
  dimensions: [
    number,
    number,
    number
  ];
}
/**
* Plan (x, y) maps to scene (x, z) with no sign flip, heights map to scene
* y — see docs/3D_GENERATION.md. rotationY is derived so that rotating the
* box's local +X axis by rotationY around scene Y lands exactly on the
* wall's (start -> end) direction in the XZ plane.
*/
export function wallTransform(wall: Wall): WallTransform {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 0.01;
  const rotationY = -Math.atan2(dy, dx);
  return {
    position: [
      (wall.start.x + wall.end.x) / 2,
      wall.height / 2,
      (wall.start.y + wall.end.y) / 2,
    ],
    rotationY,
    dimensions: [length, wall.height, wall.thickness],
  };
}
/**
* A room boundary becomes a flat THREE.Shape in its own local XY plane.
* The mesh that uses this shape must be rotated +90 deg around X to lie
* flat on the ground — see RoomMesh.tsx for why that specific sign keeps
* local Y mapped straight to world Z, matching wallTransform above.
*/
export function roomShape(boundary: Point2D[]): THREE.Shape {
  const shape = new THREE.Shape();
  boundary.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    }
    else {
      shape.lineTo(point.x, point.y);
    }
  });
  shape.closePath();
  return shape;
}
export function sceneCenter(floorPlan: FloorPlan): [
  number,
  number,
  number
] {
  return [floorPlan.plot.width / 2, 1.2, floorPlan.plot.length / 2];
}
export function sceneRadius(floorPlan: FloorPlan): number {
  return Math.max(floorPlan.plot.width, floorPlan.plot.length, 6);
}
/** Roughly human eye height — shared by Room View (Phase 8) and
* First-Person (Phase 9) so both modes put the camera at the same height. */
export const EYE_HEIGHT = 1.5;
export function wallLength(wall: Wall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 0.01;
}
export interface WallSegment {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}
export interface OpeningSpan {
  offset: number;
  width: number;
  /** The vertical hole this opening cuts, in wall-local Y (0 = floor). */
  holeYStart: number;
  holeYEnd: number;
}
/**
* The wall minus its openings, as a set of solid rectangles — see
* docs/3D_GENERATION.md for why this beats a CSG boolean subtraction here.
* A door cuts a hole from the floor up; a window cuts one floating between
* its sill and lintel. Either way this just walks the wall's length,
* emitting a full-height segment before each opening and sill/lintel
* segments (whichever exist) across it.
*/
export function computeWallSegments(wall: Wall, openings: OpeningSpan[]): WallSegment[] {
  const length = wallLength(wall);
  const sorted = [...openings].sort((a, b) => a.offset - b.offset);
  const segments: WallSegment[] = [];
  let cursor = 0;
  for (const opening of sorted) {
    const openingStart = Math.max(opening.offset, 0);
    const openingEnd = Math.min(opening.offset + opening.width, length);
    if (openingEnd <= openingStart || openingStart < cursor) {
      // Out of range or overlapping a previous opening — skip rather than
      // emit a negative-width box. Overlap prevention is Phase 13's job.
      continue;
    }
    if (openingStart > cursor) {
      segments.push({ xStart: cursor, xEnd: openingStart, yStart: 0, yEnd: wall.height });
    }
    const holeStart = Math.max(0, Math.min(wall.height, opening.holeYStart));
    const holeEnd = Math.max(holeStart, Math.min(wall.height, opening.holeYEnd));
    if (holeStart > 0) {
      segments.push({
        xStart: openingStart,
        xEnd: openingEnd,
        yStart: 0,
        yEnd: holeStart,
      });
    }
    if (holeEnd < wall.height) {
      segments.push({
        xStart: openingStart,
        xEnd: openingEnd,
        yStart: holeEnd,
        yEnd: wall.height,
      });
    }
    cursor = openingEnd;
  }
  if (cursor < length) {
    segments.push({ xStart: cursor, xEnd: length, yStart: 0, yEnd: wall.height });
  }
  return segments;
}
/** A segment's box transform, local to the wall's own group (see WallMesh). */
export function segmentTransform(wall: Wall, segment: WallSegment): {
  position: [
    number,
    number,
    number
  ];
  dimensions: [
    number,
    number,
    number
  ];
} {
  const length = wallLength(wall);
  const localX = (segment.xStart + segment.xEnd) / 2 - length / 2;
  const localY = (segment.yStart + segment.yEnd) / 2;
  return {
    position: [localX, localY, 0],
    dimensions: [segment.xEnd - segment.xStart, segment.yEnd - segment.yStart, wall.thickness],
  };
}
