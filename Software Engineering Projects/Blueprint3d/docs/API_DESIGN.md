# API Design

Base URL: `http://localhost:4000/api` in dev (no version prefix in v1 —
add `/v1` if/when this API is ever exposed beyond local dev). No auth in
v1 (see `ARCHITECTURE.md` non-goals). JSON in, JSON out. Errors are
`{ "error": string }` with a matching HTTP status.

## Health — Phase 1 (done)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, service, timestamp, database: "connected" \| "unavailable" }` |

## Projects — Phase 2 (done)

| Method | Path | Notes |
|---|---|---|
| GET | `/projects` | List, newest first |
| POST | `/projects` | `{ name, description? }` |
| GET | `/projects/:id` | |
| PATCH | `/projects/:id` | Rename / update description |
| DELETE | `/projects/:id` | Cascades to blueprints, floor plan, camera positions |

## Blueprints — Phase 3 (upload, done), Phase 11 (analysis, done)

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:id/blueprints` | List for a project, newest first. Added during Phase 3 — a natural complement to upload that the original plan didn't list explicitly |
| POST | `/projects/:id/blueprints` | Multipart upload (field name `blueprint`). Real content-sniffed (magic bytes, not the client's claimed type) against PDF/PNG/JPEG, size-capped via `MAX_UPLOAD_SIZE_MB` (Step 15) |
| GET | `/projects/:id/blueprints/:blueprintId` | Metadata + processing status. Never includes the server-side storage path |
| GET | `/projects/:id/blueprints/:blueprintId/file` | Streams the original file with the detected Content-Type |
| POST | `/projects/:id/blueprints/:blueprintId/analyze` | Sets status to `processing` and returns 202 immediately; the actual OpenCV/Tesseract run happens in the background and upserts the result as the project's floor plan on success |
| GET | `/projects/:id/blueprints/:blueprintId/analysis-status` | `pending \| processing \| completed \| failed` |

## Floor plan — Phase 4/5 (persistence done), validation Phase 14 (done)

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:id/floor-plan` | The current `FloorPlan` document. 404 if nothing's been saved yet — the editor treats that as "start empty," not an error |
| PUT | `/projects/:id/floor-plan` | Full replace, upserted — `floor_plans.project_id` is `UNIQUE`, so this is genuinely one document per project, not a growing history |
| POST | `/projects/:id/floor-plan/validate` | Domain-level checks (disconnected/overlapping walls, degenerate rooms, orphaned openings, etc.) against either the request body or the saved plan. Returns `{ issues: [{ severity, code, message, elementId? }] }`, computed on demand, not persisted |

## Materials — Phase 13 (done)

| Method | Path | Notes |
|---|---|---|
| GET | `/materials` | The palette from `DATABASE_SCHEMA.md`'s seed data |

## Camera positions — Phase 9

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:id/camera-positions` | |
| POST | `/projects/:id/camera-positions` | `{ label, mode, position, target? }` |
| DELETE | `/projects/:id/camera-positions/:viewId` | |

Everything past Health is a plan, not yet implemented — this table is the
contract Phases 2-13 will build against.
