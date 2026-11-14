CREATE TABLE IF NOT EXISTS outbound_notifications (
 id TEXT PRIMARY KEY, alert_id TEXT NOT NULL UNIQUE REFERENCES alerts(id),
 status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, error_type TEXT
);
