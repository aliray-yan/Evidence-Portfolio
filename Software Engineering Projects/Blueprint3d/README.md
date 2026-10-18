# Blueprint3D Studio

Turn an architectural drawing into a dimension-aware draft, review it against the original, and edit each component in 3D.

## Start the app

Node.js 22.12+ and Python 3.11+ are recommended. From this folder:

```text
npm run setup
python -m pip install -r backend/requirements.txt
npm run dev
```

Open http://localhost:5173. On Windows, **Start-Blueprint3D.cmd** starts the studio and opens your supplied blueprint page. The local workspace saves projects, drawings and edits in this browser; no database, account or paid API is needed. Export JSON backups before clearing browser storage. Local reference uploads are limited to 3 MB.

The development command starts the frontend and analysis service together. Dimension-aware analysis needs Tesseract OCR installed. Windows checks `C:\Program Files\Tesseract-OCR\tesseract.exe` automatically; another location can be set with `TESSERACT_BIN`. Set `PYTHON_BIN` if Python is unavailable on PATH. Without the analysis service, sample plans, JSON import, editing and the explicitly labelled Basic wall draft remain available.

For PDF analysis, install Poppler and put `pdftoppm` on PATH or set `PDFTOPPM_BIN`. Only the first page is analyzed. PDF sources can be viewed in the editor's Reference tab; image sources also support the aligned Compare drawing overlay.

## Your supplied blueprint

Choose **Your blueprint → Open retraced project**. This creates an editable reference of map1 with:

- An interpreted 40′1½″ × 70′ plot, displayed as about 10.32 marla.
- 16 named spaces, including the bedroom, kitchen, drawing room, porch, driveway, service spaces and lounge.
- Readable printed dimensions, concave boundaries, a curved staircase and front steps.
- 12 door/arch/gate openings, six proposed windows and 20 proposed furniture objects.

**This reference is a manual retrace, not the automatic converter's output.** Its small plot-width fraction and approximate irregular boundaries need review. The drawing does not establish all window positions, door widths, stair heights or ceiling heights; those assumptions remain marked for checking. The editable file is `frontend/public/reference/map1-retraced.json`.

To exercise conversion separately, create a project and upload `map1.png`. Choose **Dimension-aware analysis**, set feet, and enter `40'-1½"` for width and `70` for length. The PNG test currently reads seven room-size labels and generates 12 spaces; tiny or obscured labels, openings and irregular boundaries remain uncertain. The result comes from image strokes and text, without looking up the filename or substituting the retraced reference.

## Review and edit

1. Read the Drawing accuracy table and compare each footprint with the printed label.
2. In the 2D editor, choose Compare drawing to see the original underneath the geometry. Select walls to change endpoints or add openings; adjust floor dimensions and boundary points for irregular rooms.
3. Open 3D and use Plan view to check the layout. Choose Edit components, then click an object or choose it in the component list.
4. Move furniture using its drag arrows; change position, rotation, dimensions or color in the inspector. Duplicate or delete objects independently. Doors have editable offsets, sizes, swing, open angle and frame colors; windows have sill heights and frame colors. Floors, walls, stairs and columns also have separate properties.
5. Changes save automatically. Undo, redo, Save now and JSON export are available. Furniture edits persist through reload rather than being regenerated on every render.

Marla defaults to **272.25 sq ft**, with 225, 250 and custom standards per project. Changing the standard changes area display only. Changing plot width/length or total marla area explicitly resizes the layout and marks drawing dimensions for review. Geometry is stored in metres; feet, inches, centimetres and metres are display/input choices.

Cutaway mode visually shortens walls and openings; disable it or enter a room to see full heights. Stairs are visualized on the supplied level. Separate upper-floor plans are needed for a complete multi-level design. Room tours switch between room views rather than computing a continuous route through doors. Walk inside uses keyboard/mouse and wall collisions. Snapshots download as PNG; recordings use the browser's supported format, normally WebM in Chrome/Edge.

## Four original test maps

Find them under Sample plans, in `frontend/public/samples`, or download their ZIP from the app.

| Map | Size | Bedrooms | Spaces |
| --- | --- | --- | --- |
| The city studio | 8 × 7 m | 1 | 4 |
| The family home | 12 × 10 m | 2 | 5 |
| The urban retreat | 6 × 12 m | 1 | 4 |
| The garden villa | 14 × 12 m | 3 | 6 |

Each includes PNG, printable SVG and exact editable JSON. Open a sample directly or import JSON for exact editing tests. Upload the PNG for recognition tests; the result remains a draft. Basic wall draft works best on these clean straight-wall samples and does not read labels or openings. Without a known width, basic mode uses a stated 12 m scale assumption. Dimension-aware analysis uses readable dimensions or asks for calibration instead of silently assuming plot size.

## Accuracy and supported geometry

Extraction uses paired wall strokes, annotation filtering, room-name OCR and readable feet/inches or metric dimensions. Printed sizes constrain rectangular footprints. The reader rejects malformed inch values and measurements exceeding the plot, and cross-checks perimeter labels against room-derived scale so a gate or dimension-chain segment is not automatically used as the whole plot.

A readable room size does not prove its location, shape, walls or openings are correct. Complex scans, diagonals, curved partitions, overlapping section lines and tiny text require review and manual correction. Proposed windows/furniture are design suggestions; detected door gaps are candidates. The supplied retrace provides a separate comparison for this difficult example. The app does not promise fully accurate automatic reconstruction from every raster plan.

## Optional server workspace

The default local workspace and OCR service work without PostgreSQL. For server storage:

1. Start PostgreSQL with `docker compose up -d`.
2. Copy `backend/.env.example` to `backend/.env` and configure the database.
3. Run `npm --prefix backend run migrate:up`.
4. Copy `frontend/.env.example` to `frontend/.env`, set `VITE_STORAGE_MODE=server`, and restart.

Server and browser storage are separate. Import/export JSON to transfer plans. Server mode is a local development setup without user authentication.

## Build and verify

```text
npm run build
npm test
npm --prefix frontend run lint
```

Tests cover the four exact and synthetic raster plans, structural validation, collisions, source alignment, units/marla, independent furniture edits through JSON persistence, malformed new fields, API rejection, and OCR on the supplied architectural fixture. Python tests need the libraries and Tesseract above. Database request tests use an isolated stub; live PostgreSQL was not available on the verification host.

Browser checks include dragging, undo/redo, saved opening colors and angles, marla changes without geometry changes, reload, source comparison, desktop/390 px layouts, snapshots and actual WebM recording. Results and captures are in `verification`.

`npm run reference:generate` regenerates the manual retrace and stages proposed objects. `npm run samples:generate` regenerates sample assets using optional sharp. Source geometry and generated assets are already included. Historical documents under `docs` may describe earlier versions.

Plans are for design visualization and app testing. Use checked architectural drawings for construction.
