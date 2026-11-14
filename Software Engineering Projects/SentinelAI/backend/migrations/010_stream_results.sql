CREATE TABLE live_results (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
 session_id TEXT NOT NULL REFERENCES live_sessions(id),
 kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL,
 case_id TEXT REFERENCES cases(id)
);
CREATE INDEX idx_live_results ON live_results(session_id,seq);
