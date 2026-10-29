from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import hmac
import json
import sqlite3
import uuid


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix=""):
    return prefix + uuid.uuid4().hex[:16]


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


DEFAULT_SETTINGS = {
    "retention": {"days": 30, "quarantine_days": 1, "preserve_original": False},
    "thresholds": {"low": 10, "ambiguous": 30, "high": 60, "emergency": 85,
                   "weights": {"speech": .30, "gesture": .15, "body": .15, "context": .25, "temporal": .15}},
    "categories": {"languages": ["Urdu", "Roman Urdu", "Punjabi", "Mixed", "English"],
                   "gestures": ["money_rub", "open_palm", "pointing", "blocking", "neutral"]},
}


class Database:
    def __init__(self, path: Path, audit_key: bytes):
        self.path, self.audit_key = path, audit_key
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as con:
            con.execute("PRAGMA journal_mode=WAL")
            con.execute("CREATE TABLE IF NOT EXISTS migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)")
            for migration in sorted((Path(__file__).parent / "migrations").glob("*.sql")):
                if not con.execute("SELECT 1 FROM migrations WHERE version=?", (migration.name,)).fetchone():
                    con.executescript(migration.read_text(encoding="utf-8"))
                    con.execute("INSERT INTO migrations VALUES (?,?)", (migration.name, now()))
            for key, value in DEFAULT_SETTINGS.items():
                con.execute("INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)", (key, encode(value)))

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.path, timeout=30)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys=ON")
        con.execute("PRAGMA busy_timeout=30000")
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    @contextmanager
    def transaction(self):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            yield con

    def audit(self, con, actor, action, resource, metadata=None):
        # Call inside the same write transaction as the sensitive operation.
        previous = con.execute("SELECT entry_hash FROM audit ORDER BY seq DESC LIMIT 1").fetchone()
        payload = {"id": uid("aud_"), "actor_id": actor, "action": action, "resource": resource,
                   "metadata": encode(metadata or {}), "created_at": now(), "previous_hash": previous[0] if previous else "0" * 64}
        digest = hmac.new(self.audit_key, encode(payload).encode(), hashlib.sha256).hexdigest()
        con.execute("INSERT INTO audit(id,actor_id,action,resource,metadata,created_at,previous_hash,entry_hash) VALUES (?,?,?,?,?,?,?,?)",
                    (*payload.values(), digest))

    def verify_audit(self, con):
        previous = "0" * 64
        count = 0
        for row in con.execute("SELECT * FROM audit ORDER BY seq"):
            payload = {k: row[k] for k in ("id", "actor_id", "action", "resource", "metadata", "created_at", "previous_hash")}
            digest = hmac.new(self.audit_key, encode(payload).encode(), hashlib.sha256).hexdigest()
            if row["previous_hash"] != previous or not hmac.compare_digest(digest, row["entry_hash"]):
                return {"valid": False, "entries": count, "failed_at": row["seq"]}
            previous = row["entry_hash"]
            count += 1
        return {"valid": True, "entries": count}

    def setting(self, con, key):
        row = con.execute("SELECT * FROM settings WHERE key=?", (key,)).fetchone()
        return {"value": json.loads(row["value"]), "version": row["version"]}
