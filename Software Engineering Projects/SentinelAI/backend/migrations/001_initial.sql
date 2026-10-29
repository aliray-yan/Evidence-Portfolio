CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('citizen','officer','supervisor','responder','admin')),
 password_hash TEXT, active INTEGER NOT NULL DEFAULT 1, demo INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, blocked_until REAL NOT NULL);
CREATE TABLE IF NOT EXISTS cases (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', owner_id TEXT NOT NULL REFERENCES users(id),
 location TEXT NOT NULL DEFAULT '', latitude REAL, longitude REAL, category TEXT NOT NULL DEFAULT 'interaction',
 created_at TEXT NOT NULL, captured_at TEXT, updated_at TEXT NOT NULL, synthetic INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'processing', processing_status TEXT NOT NULL DEFAULT 'queued', processing_error TEXT,
 privacy_status TEXT NOT NULL DEFAULT 'pending', risk_label TEXT NOT NULL DEFAULT 'Unassessed', risk_score REAL,
 assessment TEXT NOT NULL DEFAULT '{}', stages TEXT NOT NULL DEFAULT '[]', assigned_to TEXT REFERENCES users(id),
 version INTEGER NOT NULL DEFAULT 1, sha256 TEXT, duration REAL, legal_hold INTEGER NOT NULL DEFAULT 0,
 UNIQUE(owner_id, sha256)
);
CREATE TABLE IF NOT EXISTS evidence (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), kind TEXT NOT NULL, storage_name TEXT UNIQUE,
 mime TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, source TEXT NOT NULL,
 start REAL NOT NULL DEFAULT 0, end REAL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS segments (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), start REAL NOT NULL, end REAL NOT NULL,
 text TEXT NOT NULL, language TEXT NOT NULL, speaker TEXT, source TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), start REAL NOT NULL, end REAL NOT NULL,
 kind TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, confidence REAL, source TEXT NOT NULL,
 references_json TEXT NOT NULL DEFAULT '[]', signals TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS reviews (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, reason TEXT NOT NULL, from_status TEXT NOT NULL, to_status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), actor_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), event_id TEXT REFERENCES events(id), kind TEXT NOT NULL,
 severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', assigned_to TEXT REFERENCES users(id),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, UNIQUE(case_id, kind)
);
CREATE TABLE IF NOT EXISTS alert_history (
 id TEXT PRIMARY KEY, alert_id TEXT NOT NULL REFERENCES alerts(id), actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY, alert_id TEXT NOT NULL REFERENCES alerts(id), channel TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
 id TEXT PRIMARY KEY, case_id TEXT UNIQUE NOT NULL REFERENCES cases(id), status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, identifier TEXT UNIQUE NOT NULL, owner_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS phrases (
 id TEXT PRIMARY KEY, phrase TEXT UNIQUE NOT NULL, category TEXT NOT NULL, language TEXT NOT NULL, explanation TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS audit (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, actor_id TEXT, action TEXT NOT NULL, resource TEXT NOT NULL,
 metadata TEXT NOT NULL, created_at TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit is append-only'); END;
CREATE INDEX IF NOT EXISTS idx_cases_queue ON cases(status,risk_score DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_case ON events(case_id,start);
CREATE INDEX IF NOT EXISTS idx_segments_case ON segments(case_id,start);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id,kind);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit(resource,seq DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status,created_at);
