CREATE TABLE live_sessions (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
 created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, ended_at TEXT,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended','interrupted','deleted')),
 stop_reason TEXT NOT NULL DEFAULT '', test_recording INTEGER NOT NULL DEFAULT 0,
 bytes_received INTEGER NOT NULL DEFAULT 0, next_sequence INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX idx_live_owner_active ON live_sessions(owner_id) WHERE status='active';
CREATE INDEX idx_live_created ON live_sessions(created_at DESC);
CREATE TABLE live_segments (
 session_id TEXT NOT NULL REFERENCES live_sessions(id), sequence INTEGER NOT NULL,
 case_id TEXT NOT NULL REFERENCES cases(id), sha256 TEXT NOT NULL,
 start_seconds REAL NOT NULL, end_seconds REAL NOT NULL, gap_seconds REAL NOT NULL,
 received_at TEXT NOT NULL, PRIMARY KEY(session_id,sequence)
);
CREATE INDEX idx_live_case ON live_segments(case_id);
