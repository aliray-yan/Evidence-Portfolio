CREATE TABLE IF NOT EXISTS search_indexes (
 case_id TEXT PRIMARY KEY REFERENCES cases(id), source_hash TEXT NOT NULL,
 model_hash TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','running','ready','failed','stale')),
 total INTEGER NOT NULL DEFAULT 0, processed INTEGER NOT NULL DEFAULT 0,
 error_code TEXT, actor_id TEXT REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS search_chunks (
 case_id TEXT NOT NULL REFERENCES search_indexes(case_id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL, source_id TEXT NOT NULL, start_char INTEGER NOT NULL,
 end_char INTEGER NOT NULL, vector BLOB NOT NULL, PRIMARY KEY(case_id,ordinal)
);
CREATE INDEX IF NOT EXISTS idx_search_jobs ON search_indexes(status,created_at);
