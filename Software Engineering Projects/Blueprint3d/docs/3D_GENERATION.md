# 3D Generation Architecture

Phase 6-8 work. Nothing implemented yet in Phase 1 — this is the plan the
Three.js/React Three Fiber code will follow.

## Coordinate mapping

`FloorPlan` coordinates are `(x, y)` in meters on the ground plane. In the
Three.js scene (Y-up, matching Three.js/R3F convention): plan `x` → scene
`x`, plan `y` → scene `z`, and all heights (wall height, sill height,
ceiling height) → scene `y`. 1 floor-plan meter = 1 Three.js unit
throughout — no separate scale factor to track.

## Walls and openings: segment-splitting, not boolean CSG

For a wall with no openings: one extruded box (`length × thickness ×
height`), positioned and rotated along `start → end`.

For a wall **with** doors/windows: instead of generating one solid box and
subtracting the opening with a CSG boolean library (extra dependency,
non-trivial performance cost, and unnecessary given the spec explicitly
allows "visually convincing" openings rather than true booleans), the wall
is built from multiple simpler boxes:

- A segment from the wall start to the opening's `offset`
- For a **door**: a segment above the opening (the lintel), from the top
  of the door to the wall's full height — no segment below, since a door
  reaches the floor
- For a **window**: segments both above (lintel) and below (sill), sized
  from `sillHeight` and the window's `height`
- A segment from the end of the opening to the wall's end

Multiple openings on one wall just mean more segments, sorted by offset.
This keeps geometry simple, keeps polygon counts low (Step 14), and needs
no extra geometry library.

## Rooms: floor and ceiling

Each room's polygon `boundary` becomes a floor mesh and a ceiling mesh via
Three.js `ShapeGeometry` (which triangulates via `earcut` internally, so
concave room shapes work, not just rectangles). Ceiling height comes from
`Room.ceilingHeight` or a building-wide default.

## Doors and windows as objects

A door is a simple box (the leaf) sized to the opening, inset slightly
into the wall thickness, using the door's `materialKey`. A window is a
thin frame (four short boxes) plus a semi-transparent glass plane, using a
`MeshPhysicalMaterial` with `transmission`/`opacity` for a lightweight
glass look. Neither needs to be geometrically complex — Step 5 explicitly
asks not to overcomplicate materials.

## Stairs

A stepped extrusion between two levels: a fixed number of box "treads"
generated procedurally from the stair's `boundary` footprint and the
level-to-level height, rather than a hand-modeled asset.

## Materials

A small registry maps `materialKey` → `MeshStandardMaterial` params
(color, roughness, metalness — or a tileable texture where one adds real
value, e.g. wood/tile). This mirrors the `materials` table in
`DATABASE_SCHEMA.md`. Geometry is memoized (`useMemo`, keyed on the
floor-plan data) so switching a material doesn't regenerate geometry, and
identical geometries (same window size, same door size) are reused rather
than rebuilt per instance.

## Camera modes

- **Overview** — Drei's `OrbitControls`, target set to the bounding-box
  center of the whole generated house.
- **First-person walkthrough** — Drei's `PointerLockControls` for mouse
  look, plus a WASD movement hook. Gravity/floor detection via a single
  downward raycast against the floor meshes each frame. Collision uses
  **2D circle-vs-segment math in the XZ plane** (the player as a circle,
  each wall as a line segment) rather than a full 3D physics engine —
  it's cheap, it's exactly the precision a walkthrough needs, and it
  avoids pulling in Rapier/Cannon as a dependency for something this
  contained.
- **Room view** — camera fixed near room-center height, rotation-only
  orbit (no pan/zoom), with a plain HTML overlay (outside the R3F canvas,
  for simplicity) showing room name, dimensions, and area — e.g. *"Living
  Room — 18 ft × 20 ft — Area: 360 sq ft"* as in the spec's own example.

## Performance (Step 14)

- Shared/instanced geometry for repeated elements (same-size windows,
  doors, stair treads)
- Geometry generation memoized on the floor-plan document, not
  regenerated per frame or per render
- No CSG library, no full physics engine — see above
- Floor/ceiling/wall meshes merged per room where practical to cut draw
  calls
