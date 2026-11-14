CREATE TABLE upload_sessions (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL REFERENCES users(id),
    fingerprint TEXT NOT NULL,
    metadata TEXT NOT NULL,
    extension TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    total INTEGER NOT NULL,
    received INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','completed')),
    case_id TEXT REFERENCES cases(id),
    duplicate INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    UNIQUE(actor_id, fingerprint)
);
CREATE INDEX upload_expiry ON upload_sessions(expires_at);
CREATE TABLE upload_chunks (
    upload_id TEXT NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    offset INTEGER NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    ciphertext BLOB NOT NULL,
    PRIMARY KEY(upload_id, offset)
);
