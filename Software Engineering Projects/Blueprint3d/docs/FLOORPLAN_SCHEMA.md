# Floor-Plan JSON Schema

This is the single structured document that the 2D editor, the blueprint
analyzer, and the 3D generator all read and write. It supersedes the
example in the original spec (still a fine mental model) with a slightly
more general shape — reasoning below. Not implemented in code until
Phase 5; this doc is the contract that implementation will follow.

## Units and coordinates

- All numeric lengths in the document are stored in **meters**, regardless
  of what unit the user is viewing/editing in (`m`, `cm`, `ft`, `in` are
  supported at the UI layer and converted on the way in/out — see
  `utils/units.ts` in `FOLDER_STRUCTURE.md`).
- 2D plan coordinates are `(x, y)`, where `x` is the plot's width axis and
  `y` is its depth axis. `3D_GENERATION.md` covers how this maps onto the
  Three.js scene.
- v1 models a **single building level**. `metadata` and the top-level
  shape leave room to extend to `levels: FloorPlan[]` for multi-story
  houses later without breaking anything that only knows about one level.

## Why start/end points instead of `x, y, length, orientation`

The original example represents a wall as `x, y, length, thickness,
orientation: "horizontal"`, which only works for axis-aligned walls.
Representing a wall as a `start`/`end` point pair is strictly more
general — length and orientation are trivially derivable
(`Math.hypot`/`Math.atan2`) — and the schema doesn't have to change if an
angled wall ever needs to be supported. Generation logic can still
special-case the axis-aligned rectangular layouts most houses actually
have.

## Why doors/windows reference `wallId` + `offset`

An opening is defined relative to *its* wall (`wallId`, plus `offset`
meters along that wall from `start`) rather than by its own absolute
`(x, y)`. That way, if a wall moves in the editor, its doors and windows
move with it automatically instead of becoming orphaned in space — and it
maps directly onto the wall-segment-splitting approach in
`3D_GENERATION.md`.

## Shape

```ts
export type LengthUnit = 'm' | 'cm' | 'ft' | 'in';

export interface Point2D {
  x: number; // meters
  y: number; // meters
}

export interface Plot {
  width: number;          // meters
  length: number;         // meters
  boundary?: Point2D[];   // optional, for non-rectangular plots
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number;      // meters
  height: number;         // meters
  type: 'exterior' | 'interior';
  materialKey?: string;   // references materials.key
}

export interface Opening {
  id: string;
  wallId: string;
  offset: number;         // meters from wall.start, along the wall
  width: number;          // meters
  height: number;         // meters
  sillHeight?: number;    // meters — windows only, floor to opening bottom
  swing?: 'left' | 'right' | 'sliding' | 'none'; // doors only
  materialKey?: string;
}

export interface Room {
  id: string;
  name: string;
  boundary: Point2D[];    // polygon, supports non-rectangular rooms
  floorMaterialKey?: string;
  ceilingMaterialKey?: string;
  ceilingHeight?: number; // meters; defaults to the building default
}

export interface Stair {
  id: string;
  boundary: Point2D[];
  fromLevel: number;
  toLevel: number;
  direction: 'up' | 'down';
}

export interface Column {
  id: string;
  position: Point2D;
  width: number;
  depth: number;
  height: number;
}

export interface FloorPlan {
  schemaVersion: number;
  unit: LengthUnit;        // display unit only — values above are always meters
  plot: Plot;
  walls: Wall[];
  rooms: Room[];
  doors: Opening[];
  windows: Opening[];
  stairs: Stair[];
  columns: Column[];
  metadata: {
    sourceBlueprintId?: string;
    verifiedAt?: string;   // ISO timestamp; unset until human verification
    confidence?: number;   // 0-1, set by the analyzer, cleared on manual edit
  };
}
```

## Example

```json
{
  "schemaVersion": 1,
  "unit": "ft",
  "plot": { "width": 15.24, "length": 27.43 },
  "walls": [
    {
      "id": "w1",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 15.24, "y": 0 },
      "thickness": 0.23,
      "height": 2.74,
      "type": "exterior"
    },
    {
      "id": "w2",
      "start": { "x": 5.5, "y": 0 },
      "end": { "x": 5.5, "y": 6.1 },
      "thickness": 0.1,
      "height": 2.74,
      "type": "interior"
    }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Living Room",
      "boundary": [
        { "x": 0, "y": 0 }, { "x": 5.5, "y": 0 },
        { "x": 5.5, "y": 6.1 }, { "x": 0, "y": 6.1 }
      ],
      "floorMaterialKey": "wood"
    }
  ],
  "doors": [
    { "id": "d1", "wallId": "w2", "offset": 1.0, "width": 0.9, "height": 2.03, "swing": "left" }
  ],
  "windows": [
    { "id": "win1", "wallId": "w1", "offset": 2.0, "width": 1.2, "height": 1.2, "sillHeight": 0.9 }
  ],
  "stairs": [],
  "columns": [],
  "metadata": { "confidence": 0.82 }
}
```
