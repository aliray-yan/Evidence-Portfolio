# Verification — 14 October 2026

Windows, Node 24, Python 3.11, Tesseract and headless Edge/Chromium with software WebGL.

## Follow-up architectural drawing update

- Frontend/backend production build, frontend lint and npm test pass. Python suite: 7 tests.
- All four exact sample plans and synthetic raster fixtures pass; existing collision, wall/opening and calibration checks pass.
- Added tests for imperial fractions, typed metric input, invalid inch values, 272.25 sq ft default/custom marla, persisted independent furniture edits, malformed component fields, and image registration after unequal plot scaling.
- Supplied PNG analyzed through the real database-free API using an arbitrary filename: HTTP 200, 12 spaces, 7 room-size readings, 5 door candidates. Plot calibration: 12.2301 × 21.336 m. Automatic output is saved as map1-auto.json and remains a draft.
- Kitchen 13′ × 14′9″, bedroom 21′ × 15′, drawing room 13′ × 19′ and porch 18′6″ × 18′3″ are read and constrain their rectangular footprints. TV lounge, wardrobe and tiny service labels require review; automatic curved geometry is not claimed as solved.
- Supplied image converted to a one-page PDF fixture and analyzed through Poppler: HTTP 200, 11 spaces and 6 total dimension records (including the two entered plot dimensions). Rasterization/OCR changes the readings, so PDF results also require review.
- The separate manual retrace validates with no geometry errors: 16 spaces, 36 wall segments, 12 openings, 6 proposed windows, 2 stair flights, 2 columns and 20 proposed furniture objects. This is never substituted by the automatic detector.
- Browser exercised reference project creation, top view, source overlay, independent colors/rotation, separate door angle/frame color and window color, save and reload.
- A real X-axis gizmo drag moved the selected bed from x=6.096 to x=7.5 m; undo returned x=6.096, and redo reapplied the move. Other objects remained unchanged.
- Changing marla standard to 225 persisted without changing wall geometry; restored default 272.25 and checked after reload.
- Desktop and 390 px mobile overview/editor have no horizontal page overflow.
- Actual PNG snapshot and approximately 8.5-second WebM tour downloaded. No uncaught browser JavaScript errors.
- Fixed duplicate camera/control rendering keys and explicitly selected the supported shadow mode. Final browser checks report no console errors. A dependency emits a non-fatal Three.Clock deprecation warning.
- Fresh server drafts get proposed furnishings/windows once; deliberately deleted objects remain deleted.
- Overview/plan mode render on demand; orbit and transform controls still update. Room/tour/first-person modes render continuously.
- Live PostgreSQL integration remains untested because the Docker engine was unavailable; request validation uses an isolated database stub. Local project storage and real OCR endpoint were exercised.

Verification media demonstrate functionality, not construction approval. Stair rise, ceiling heights, unprinted openings and proposed furnishings require review.

The root npm run dev command was verified starting both services together on Windows. The launcher waits for both services before opening the browser.
