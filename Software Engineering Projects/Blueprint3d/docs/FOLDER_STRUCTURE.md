# Folder Structure

Target layout for the whole project. `[Phase N]` marks when a
file/folder is introduced — most of this doesn't exist yet after Phase 1.
Phase 1 only creates what's needed to run both apps end to end.

```
blueprint3d/
├── docker-compose.yml              [Phase 1] Postgres for local dev
├── .gitignore                      [Phase 1]
├── README.md                       [Phase 1]
├── docs/                           [Phase 1]
│   ├── ARCHITECTURE.md
│   ├── FOLDER_STRUCTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── FLOORPLAN_SCHEMA.md
│   ├── API_DESIGN.md
│   ├── BLUEPRINT_PIPELINE.md
│   ├── 3D_GENERATION.md
│   └── MILESTONES.md
│
├── frontend/
│   ├── index.html                  [Phase 1]
│   ├── package.json                [Phase 1]
│   ├── vite.config.ts              [Phase 1]
│   ├── tsconfig*.json              [Phase 1]
│   ├── .env.example                [Phase 1]
│   └── src/
│       ├── main.tsx                [Phase 1]
│       ├── App.tsx                 [Phase 1] — replaced by router + layout in Phase 12
│       ├── App.css / index.css     [Phase 1]
│       ├── vite-env.d.ts           [Phase 1]
│       ├── api/
│       │   └── client.ts           [Phase 1] — grows into one client module per resource
│       ├── types/
│       │   └── floorPlan.ts        [Phase 5] mirrors FLOORPLAN_SCHEMA.md
│       ├── pages/                  [Phase 3+]
│       │   ├── Dashboard/          [Phase 2] project list, create/rename/delete
│       │   ├── BlueprintUpload/    [Phase 3] upload + preview + zoom/pan
│       │   ├── FloorPlanEditor/    [Phase 4] the verification/editor screen
│       │   └── Walkthrough/        [Phase 8-13] 3D viewer + presentation mode
│       ├── components/
│       │   ├── layout/             [Phase 2+] dashboard/workspace shell, sidebar, panels
│       │   ├── floor-plan-2d/      [Phase 4] grid, wall/room editing, dimension inputs
│       │   ├── three-scene/        [Phase 6-8]
│       │   │   ├── generators/     walls.ts, rooms.ts, openings.ts, stairs.ts
│       │   │   ├── camera/         OverviewCamera, FirstPersonCamera, RoomCamera
│       │   │   └── materials/      material registry + selector UI
│       │   └── shared/             buttons, panels, etc. used across pages
│       ├── hooks/                  [Phase 8-10] e.g. useKeyboardMovement, useCollision
│       ├── store/                  [Phase 4+] floor-plan editing state
│       └── utils/
│           └── units.ts            [Phase 3] m ⇄ cm ⇄ ft ⇄ in conversion
│
└── backend/
    ├── package.json                [Phase 1]
    ├── tsconfig.json                [Phase 1]
    ├── .env.example                [Phase 1]
    └── src/
        ├── server.ts               [Phase 1]
        ├── app.ts                  [Phase 1]
        ├── config/
        │   └── env.ts              [Phase 1]
        ├── db/
        │   ├── pool.ts             [Phase 1]
        │   └── migrations/         [Phase 2] node-pg-migrate (or numbered .sql) — see DATABASE_SCHEMA.md
        ├── middleware/
        │   ├── errorHandler.ts     [Phase 1]
        │   └── notFound.ts         [Phase 1]
        ├── routes/
        │   ├── health.ts           [Phase 1]
        │   ├── projects.ts         [Phase 2]
        │   ├── blueprints.ts       [Phase 3]
        │   └── floorPlans.ts       [Phase 5]
        ├── services/
        │   ├── projects/           [Phase 2]
        │   ├── blueprint-processing/  [Phase 11]
        │   │   ├── BlueprintAnalyzer.ts     the interface (see ARCHITECTURE.md)
        │   │   ├── HeuristicBlueprintAnalyzer.ts
        │   │   └── worker/          the Python OpenCV/Tesseract script
        │   └── validation/         [Phase 13] the checks from Step 13 of the spec
        ├── types/                  [Phase 5] mirrors FLOORPLAN_SCHEMA.md
        └── uploads/                [Phase 3] local dev file storage, gitignored
```

Nothing under `pages/`, `components/`, `services/blueprint-processing/`,
etc. exists yet — they're listed here so the target shape is visible up
front, per the spec's own request for a folder structure before code.
