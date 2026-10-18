# Development Milestones

The 14 phases from the spec's own build order, as a checklist. One phase
at a time; the app stays runnable after each. (Note: a few UI-only
"Steps" from the spec — the full dashboard/workspace chrome in Step 12,
room navigation/mini-map in Step 8 — aren't pinned to a specific phase in
the 14-phase list; they'll get built alongside whichever phase first
needs them, e.g. workspace shell with Phase 2, room navigation with
Phase 9.)

- [x] **Phase 1 — Foundation.** React/TypeScript/Vite frontend and
  Express/TypeScript backend scaffolded and talking to each other;
  Postgres available via Docker Compose. *Done this session.*
- [x] **Phase 2 — Project management.** `projects`/`users` migration
  (via `node-pg-migrate`) and the full CRUD API verified against a real
  Postgres instance: create, list, get, rename (`PATCH`), delete, and the
  404/400 paths. *Done this session.* Dashboard UI (create/open/rename/
  delete screen) is still open — the spec doesn't pin it to a specific
  phase; it'll land alongside Phase 3's upload UI or its own pass.
- [x] **Phase 3 — Blueprint upload and preview.** `blueprints` migration;
  upload/list/get/file endpoints verified against real PDF/PNG files,
  including rejecting a spoofed fake-PNG by content (not extension) and
  blocking cross-project access. Frontend: routing (`react-router-dom`),
  a Dashboard (list/create projects) and a project workspace page with
  drag-and-drop upload, a PDF/image preview, and a hand-rolled zoom/pan
  viewer (wheel zoom, drag pan) — no new viewer dependency needed.
  *Done this session.*
- [x] **Phase 4 — Manual floor-plan editor.** SVG-based 2D editor:
  select/drag walls (endpoint handles), draw walls and polygon rooms,
  attach doors/windows to a selected wall with an editable offset, rename
  rooms, edit plot size, switch display units (m/cm/ft/in) — all against
  an in-memory `FloorPlan`, no CV or backend persistence yet (that's
  Phase 5, on purpose — see the spec's own phase split). The reducer
  driving all of this was verified directly (add/move/delete, and
  confirmed deleting a wall cascades to remove its doors/windows).
  *Done this session.* Editing an existing room's boundary after creation
  isn't supported yet — rooms are drawn once as a closed polygon; that's
  a reasonable follow-up, not a blocker for later phases.
- [x] **Phase 5 — Structured floor-plan JSON.** `floor_plans` migration
  (one row per project, enforced with a `UNIQUE` constraint + upsert —
  `PUT` really does mean full replace, not a growing history table);
  `GET`/`PUT` endpoints with basic envelope validation (right top-level
  shape — full domain validation is still Phase 13); the editor now
  loads any saved plan on open and saves explicitly via a Save button
  with status feedback. Verified end to end: 404 before first save,
  save → load round-trips exactly, saving twice updates in place
  (confirmed exactly one row), and a malformed body gets a 400.
  *Done this session.* The frontend `FloorPlan` type now carries
  `stairs`/`columns`/`metadata` too, even though the editor UI doesn't
  expose editing them yet — so a save/load round-trip never silently
  drops fields later phases will need.
- [x] **Phase 6 — Procedural 3D wall/floor/room generation.** First real
  Three.js/R3F scene: walls as extruded boxes (correct at any angle, not
  just axis-aligned — verified numerically, see below), room floors +
  ceilings via `ShapeGeometry`, basic lighting, and an orbiting camera
  sized to the plot so small and large houses both frame reasonably by
  default. *Done this session.* Solid walls only — door/window openings
  are Phase 7, on purpose.
  **Verification note:** this sandbox has no working headless browser
  (Ubuntu's `chromium-browser` package is snap-only and snapd doesn't run
  in a container, and Playwright/Puppeteer would need to download a
  Chromium binary from outside the allowed network), so I couldn't
  screenshot the actual render. What I *did* verify: the wall
  position/rotation math numerically against known directions —
  axis-aligned in both plan axes, negative-axis, and a 3-4-5 diagonal
  wall — all match the expected world-space direction exactly; the
  TypeScript build (which resolves R3F/Drei's JSX types) is clean; and
  both the dev server and a seeded test house serve without error. The
  geometry is math-verified, not eyeballed — worth an extra look in an
  actual browser before treating it as pixel-perfect.
- [x] **Phase 7 — Doors and windows.** Wall-segment splitting per
  `docs/3D_GENERATION.md`: each wall computes its solid segments around
  its doors/windows (full-height where there's no opening, sill/lintel
  pieces where there is), plus a door leaf and a semi-transparent window
  pane filling each opening. *Done this session.*
  **Verified two ways:** numerically — an area-conservation check
  (segment areas + hole areas must equal the wall's total area exactly)
  across 6 realistic layouts (no openings, a door, a window, both
  together, an opening flush with either end of the wall) all pass
  exactly; a 7th deliberately-overlapping case confirmed the algorithm
  drops the conflicting opening rather than producing corrupt geometry,
  rather than actually being wrong. And end-to-end — a seeded house with
  a real door and window round-trips through the API and the walkthrough
  route serves it without error. Still no headless browser in this
  sandbox (see Phase 6's note), so — same as Phase 6 — this is
  math-verified and served-without-crashing, not screenshotted.
  Window frames are a plain glass pane for now, not the separate 4-box
  frame `3D_GENERATION.md` describes — a reasonable visual simplification
  to revisit later, not a blocker.
- [x] **Phase 8 — Orbit/360° camera.** Two orbit-style modes, covering
  both Step 6A (Overview) and Step 7 (360° Room View) from the spec,
  since neither needs WASD movement — that's what sets them apart from
  Phase 9: **Overview** — rotate/zoom/pan around the whole house, zoom
  clamped to the plot size, capped from dipping below the horizon.
  **Room view** — pick a room from a dropdown, the camera jumps to eye
  height at that room's centroid, rotation-only (no pan/zoom, per
  `docs/3D_GENERATION.md`), with an overlay showing room name,
  dimensions, and area, unit-switchable. *Done this session.*
  Room view uses `OrbitControls` with its distance locked to ~1cm rather
  than a true fixed-position look-around camera — a deliberate
  approximation that avoids duplicating the pointer-lock first-person
  controller Phase 9 adds properly.
  **Verified:** the polygon-area math (Shoelace formula) numerically
  against a rectangle in both winding orders, a 3-4-5 triangle, and a
  concave L-shape — all exact. Then confirmed the actual overlay output
  for a seeded 4m×5m room: 20 m² and (independently) 215.3 sq ft, which
  is the correct conversion. Full stack serves a real two-room house with
  an interior door. Still no headless browser here, so the camera
  *feel* (does dragging actually rotate smoothly, does room view avoid
  clipping into walls) is unverified by me — worth checking in a real
  browser.
- [x] **Phase 9 — First-person walkthrough.** A third "Walk through" mode:
  Drei's `PointerLockControls` for mouse look plus a hand-rolled WASD/
  arrow-key mover, both wired through a "click to look around" prompt and
  a simple crosshair (per spec Step 6B) that only shows once the pointer
  is actually locked. Room selection now doubles as navigation — picking
  a room teleports the start point there (Step 8's "selecting a room
  should move the camera to that room"), after which you walk normally.
  *Done this session.* No walls, no gravity yet, on purpose — Step 6B
  bundles those with first-person camera work, but the spec's own phase
  list splits them out as Phase 10, so you can currently walk straight
  through walls. That's next, not a bug.
  **Verified:** pulled the WASD vector math out into a plain function and
  checked it numerically — all four cardinal directions from two
  different facing angles, confirmed looking up/down doesn't make you
  fly (the forward vector correctly flattens to horizontal), and
  confirmed diagonal movement (W+D together) is normalized to the same
  speed as a single key, not faster. One of my own test cases was wrong
  on the first pass (I mis-guessed which way "right" should point when
  facing +X) — worth mentioning since it's exactly the kind of thing
  that's easy to eyeball wrong; the corrected math checks out against
  the cross-product by hand. Full stack still serves. Actual feel
  (mouse sensitivity, whether PointerLockControls behaves as expected on
  click) is unverified — no headless browser here, same as Phases 6-8.
- [x] **Phase 10 — Collision detection.** The 2D circle-vs-segment math
  from `docs/3D_GENERATION.md`, wired into first-person movement: the
  player is a small circle, each wall a capsule of its own thickness.
  Doors are always passable; windows are passable *only* if their sill is
  effectively at floor level — a standard window still blocks movement,
  because the solid sill under the glass stops a walking person even
  though the opening above it doesn't. Floor-following is a real downward
  raycast against the floor mesh (not a hardcoded height), smoothed with
  `THREE.MathUtils.damp` rather than snapping — genuinely "gravity and
  floor detection," even though v1's single flat level means it always
  resolves to the same height today; the mechanism is there for whenever
  multi-level floors exist. *Done this session.*
  **Verified numerically:** wall-gap generation for a door, a standard
  window, and a floor-to-ceiling window (the one case where a window
  *should* be passable) all produced exactly the expected segments.
  Circle-vs-wall push-out was checked three ways: pushed to exactly
  `halfThickness + radius` on a head-on approach, left completely
  unchanged when the same position falls inside a door's gap, and left
  unchanged when far from any wall. Full stack still serves a house with
  both a door and a window. Same caveat as Phases 6-9: no headless
  browser here, so the in-browser *feel* (does it actually stop you at
  the wall, does the floor-follow feel smooth) is unverified by me.
- [x] **Phase 11 — Blueprint OCR/computer-vision analysis.** The
  `HeuristicBlueprintAnalyzer` from `docs/ARCHITECTURE.md`, for real: a
  Python worker (OpenCV + Tesseract) invoked as a subprocess from the Node
  API, wired into `POST .../analyze` (returns 202 immediately, runs in the
  background) and `GET .../analysis-status`. On success the draft is
  upserted straight into the project's floor plan — the same Phase 5
  mechanism a manual editor save uses — so it shows up in the editor for
  review exactly like any other saved plan. On failure the blueprint's
  status is set to `failed` and the server stays healthy; nothing is ever
  left stuck "processing" short of the whole process dying.
  Deliberately does **not** attempt door/window detection — distinguishing
  a door-swing arc or window symbol from a wall line, across arbitrary
  drawing styles, is meaningfully harder than wall/room detection, and a
  wrong guess is worse than none given the editor already has one-click
  "+ Door"/"+ Window" buttons. *Done this session.*
  **Verified empirically, not just numerically** — this phase is heavier
  on real-world testing than pure math: generated a synthetic but
  representative test blueprint (two rooms, a dimension label, room-name
  labels) and ran the actual pipeline against it, which surfaced and let
  me fix two genuine bugs before calling it done: (1) Tesseract splits
  "20 ft" and "Living Room" into separate word tokens, so the original
  dimension-matching and room-naming silently failed until I added
  proximity-based phrase grouping; (2) the same drawing rasterized from a
  PDF at a different DPI produced a different wall count, because my
  detection thresholds were implicitly tuned to one pixel scale — fixed
  by normalizing image size before analysis. After both fixes: plot size
  came out within centimeters of the drawing's true dimensions via the
  OCR'd "20 ft" label, room names came out exactly right ("Living Room",
  "Bedroom"), and results stayed consistent across the original image, a
  4°-rotated version (exercising deskew), and the PDF-rasterized version.
  Also confirmed the full async flow end-to-end through the real API —
  upload → analyze → poll → completed → floor plan retrievable — and the
  failure path with a genuinely corrupt file — upload → analyze → poll →
  failed, server still healthy afterward.
  **Known limitation to be upfront about:** this is a heuristic pipeline
  tested on one clean synthetic drawing, not a broad set of real-world
  blueprints. Hand-drawn sketches, low-quality scans, and non-standard
  drafting conventions will likely need much more manual correction in
  the editor than this one test case suggests — which is the entire
  reason human verification is mandatory here rather than a formality.
- [x] **Phase 12 — Connect automatic analysis to the floor-plan editor.**
  Most of the actual data flow (upload → analyze → auto-saved as the
  floor plan → loaded by the editor) was already true by construction
  once Phase 11 landed, since analysis writes through the same Phase 5
  upsert a manual save uses. What Phase 12 adds is the part of the spec's
  human-verification section that wasn't built yet: **seeing the original
  blueprint while editing** — a "Blueprint" tab in the editor's sidebar
  (next to "Properties") showing the source image/PDF in the same
  pan/zoom viewer Phase 3 already built for the upload page, and a
  confidence banner that reads the analyzer's own `metadata.confidence`
  — a plain review notice above ~0.4, a stronger "the scale is a rough
  guess, check dimensions first" warning below it — so a low-confidence
  result doesn't look identical to a well-calibrated one. Nothing shows
  for a manually-drawn plan that was never analyzed (no `confidence`
  field at all). *Done this session.* Verified against the real Phase 11
  pipeline output, not a mocked value: uploaded and analyzed the test
  blueprint through the actual API, confirmed the returned confidence
  (0.6) lands on the correct side of the threshold.
- [x] **Phase 13 — Materials and presentation mode.** Three pieces:
  (1) **Materials** — the `materials` table + seed data from
  `DATABASE_SCHEMA.md` finally implemented as a migration, a `GET
  /materials` endpoint, `materialKey` fields added to `Wall`/`Room`/
  `Opening`, a shared material dropdown reused across wall/floor/ceiling/
  door/window (one flat list, not four category-filtered ones — per
  Step 5's own "do not overcomplicate" — since the initial 7 materials
  don't cleanly sort into per-slot categories anyway, e.g. wood as
  a floor material vs. a very plausible door material), and the 3D
  renderer now reads `materialKey` through a small color/roughness/
  metalness registry instead of hardcoded colors. (2) **Presentation
  mode** — a toggle that swaps the technical Overview/Room-view/Walk-
  through controls for a customer-facing nav: an "Outside" button, one
  pill per room, "Walk through", and a tour button — covering Step 10's
  room names, navigation, walkthrough, and exterior/interior switching.
  (3) **Tour mode** — cycles through the actual rooms in the plan
  automatically (jump-cut, not a smooth pan — animating between two
  arbitrary camera positions is real added complexity for a v1 nicety)
  and can be stopped anytime. The construction-ready **disclaimer**
  flagged as a standing requirement all the way back in Phase 1's
  `ARCHITECTURE.md` is now live, in the walkthrough's footer,
  unconditionally. *Done this session.*
  Verified materials end to end against the real API (round-tripped a
  wall/floor/ceiling material assignment through save and load, not just
  the type system) plus the full build/serve chain for both the editor's
  new Blueprint/Properties tabs and the walkthrough's presentation nav.
- [x] **Phase 14 — Testing, optimization, and security hardening.** The
  spec's Steps 13/14/15 aren't pinned to specific phases any more than
  Steps 8/12 were (see the note at the top of this file) — they land
  here, in the last phase, which is where "testing, optimization, and
  security hardening" naturally covers all three. *Done this session.*
  **Validation (Step 13):** domain-level checks distinct from the
  envelope check `PUT /floor-plan` already did — disconnected/overlapping
  walls, an unclosed exterior boundary, degenerate room geometry, and
  openings referencing a wall that no longer exists or overrunning it.
  Exposed as `POST /floor-plan/validate` plus a "Validate" button in the
  editor that lists results by severity. Verified against a clean
  floor plan (zero false positives) and a deliberately broken one
  (correctly caught all six planted problems).
  **Performance (Step 14):** the >500kB bundle-size warning that's shown
  up in every build since Phase 6 turned out to be fixable, not just
  notable — lazy-loading the walkthrough page (the only one that needs
  Three.js/R3F/Drei) cut the main bundle from 1.18MB to 255KB, a real,
  measured 4.6x reduction for every page that isn't the 3D view.
  **Security (Step 15):** an audit against the spec's own checklist
  found the list was mostly already satisfied by earlier phases (magic-
  byte upload validation, parameterized queries throughout, generated
  filenames only), plus three genuine gaps worth fixing now: `helmet`
  for standard HTTP security headers, `PATCH /projects/:id` silently
  accepted a non-string `description` (would have been coerced rather
  than rejected), and numeric env vars had no guard against parsing to
  `NaN` on a malformed value.
  **Also caught and fixed a real doc bug while writing this entry**: the
  validate endpoint was mislabeled "Phase 13" in `API_DESIGN.md` and
  `BLUEPRINT_PIPELINE.md` — those docs were written back in Phase 1 by
  matching the spec's *Step* 13 (Validation) number to a *Phase* number
  without checking the actual 14-phase list, where Phase 13 is materials
  and presentation mode, not validation. Corrected both.
  **Full regression pass:** reran the standalone numeric verification
  scripts from Phases 4, 6, 7, 8, 9, and 10 (reducer cascade-delete,
  diagonal wall rotation, wall-segment area conservation, polygon area,
  WASD movement, and door/wall collision) against the current codebase —
  all still pass, confirming nothing drifted across the several later
  phases that touched shared files like the `FloorPlan` type.
