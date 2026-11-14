CREATE TABLE reading_guides (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    actor_id TEXT NOT NULL REFERENCES users(id),
    source_hash TEXT NOT NULL,
    case_version INTEGER NOT NULL,
    requested_model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','completed','failed','obsolete')),
    result_json TEXT NOT NULL DEFAULT '{}',
    error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX reading_guides_case ON reading_guides(case_id,created_at DESC);
CREATE INDEX reading_guides_created ON reading_guides(created_at);
