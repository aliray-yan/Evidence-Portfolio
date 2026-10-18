# Database Schema

PostgreSQL. Nothing here is applied yet — Phase 1 ships the connection
pool and a health check only. This is the target schema for Phase 2
onward, written now so the data model is settled before code depends on
it.

## Tables

- **users** — minimal placeholder (`id`, `display_name`, `created_at`).
  The spec doesn't call for login/auth, so v1 has no auth flow, but
  `projects.user_id` points here so multi-user support can be added later
  without restructuring anything.
- **projects** — one row per house project ("Ahmed Family House").
- **blueprints** — the uploaded source file(s) for a project, plus
  processing status.
- **floor_plans** — the structured floor-plan document for a project. See
  "Why JSONB" below.
- **materials** — the small reference palette from Step 5 (concrete,
  painted wall, brick, wood, tile, glass, metal). Rooms/walls/openings
  reference a material by `key` inside the floor-plan JSON rather than a
  join table.
- **camera_positions** — saved views per project (Step 9: "saved camera
  positions").

Validation warnings (Step 13) are **not** persisted — they're computed
on demand from the current floor-plan document by the validation service
and returned from the API, so there's no separate table that could go
stale relative to the data it's validating.

## Why floor-plan data is JSONB, not fully normalized

`floor_plans.data` stores the whole structured floor-plan document (walls,
rooms, doors, windows, stairs, columns — see `FLOORPLAN_SCHEMA.md`) as one
JSONB value instead of a wall table + room table + door table etc.
Reasons:

1. The shape of that document is expected to keep changing through Phases
   4-13 (the editor, the CV pipeline, validation) — a fully normalized
   schema would mean a migration every time a field is added.
2. The 2D editor and 3D generator both read/write the document as a
   whole (a save from the editor is "replace the floor plan," not a series
   of row-level updates), so there's little benefit to decomposing it
   relationally.
3. Postgres's JSONB plus a GIN index still gives reasonable query power if
   it's ever needed (e.g., "find projects with more than 4 bedrooms").

`projects`, `blueprints`, `materials`, and `camera_positions` stay
relational because they're genuinely row-shaped and independently
queried/updated.

## DDL

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE blueprint_processing_status AS ENUM
  ('pending', 'processing', 'completed', 'failed');

CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  processing_status blueprint_processing_status NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'm',
  plot_width NUMERIC,
  plot_length NUMERIC,
  data JSONB NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE above already gives project_id an index, so there's no separate
-- btree index on it — added during Phase 5 once the API's "one floor plan
-- per project, PUT upserts it" contract made the constraint necessary.
CREATE INDEX idx_floor_plans_data_gin ON floor_plans USING GIN (data);

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('wall', 'floor', 'ceiling', 'door', 'window', 'roof')),
  color TEXT,
  texture_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE camera_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('overview', 'first-person', 'room')),
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  position_z NUMERIC NOT NULL,
  target_x NUMERIC,
  target_y NUMERIC,
  target_z NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camera_positions_project_id ON camera_positions(project_id);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_floor_plans_updated_at BEFORE UPDATE ON floor_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Seed data (materials, Step 5's initial palette)

```sql
INSERT INTO materials (key, label, category, color, is_default) VALUES
  ('concrete',     'Concrete',      'wall',   '#9a9a92', false),
  ('painted-wall', 'Painted Wall',  'wall',   '#f2efe9', true),
  ('brick',        'Brick',         'wall',   '#a4543a', false),
  ('wood',         'Wood',          'floor',  '#8a5a34', true),
  ('tile',         'Tile',          'floor',  '#d9d4c9', false),
  ('glass',        'Glass',         'window', '#bcd9e6', true),
  ('metal',        'Metal',         'door',   '#8d8f92', false);
```

## Migrations

Phase 2 wired this up with `node-pg-migrate`, running against
`backend/src/db/migrations/`. Migration files are plain `.js` using the
tool's schema-builder API (`pgm.createTable`, `pgm.createFunction`,
etc.) — a nested `backend/src/db/migrations/package.json` with
`{ "type": "module" }` scopes just that folder to ESM (matching what
`node-pg-migrate create` scaffolds) without touching the module system
for the rest of the CommonJS backend. `npm run migrate:up` /
`migrate:down` / `migrate:create` (from `backend/`) wrap the CLI with the
right `--migrations-dir` and `--envPath .env` flags — running migrations
needs a real `.env` (copied from `.env.example`), since unlike the app
server, the migration tool has no built-in fallback connection string.

The first migration (`create-users-and-projects`) creates exactly the
`users` and `projects` tables above, plus the `set_updated_at()` trigger
function applied to `projects`. `blueprints`, `floor_plans`, `materials`,
and `camera_positions` are separate migrations added in their own phases
(3, 5, 5, 9), not created up front.
