"""SQLite access layer. One demo-session mission per database file."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "astro_health.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS mission (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    astronaut_name TEXT NOT NULL,
    current_day INTEGER NOT NULL DEFAULT 0,
    data_profile TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    indicator TEXT NOT NULL,
    mission_day INTEGER NOT NULL,
    value REAL NOT NULL,
    injected_anomaly TEXT,
    is_flagged INTEGER NOT NULL DEFAULT 0,
    anomaly_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(indicator, mission_day)
);

CREATE INDEX IF NOT EXISTS idx_readings_indicator_day
    ON readings (indicator, mission_day);

CREATE TABLE IF NOT EXISTS check_ins (
    mission_day INTEGER PRIMARY KEY,
    mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
    energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 5),
    stress INTEGER NOT NULL CHECK (stress BETWEEN 1 AND 5),
    sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS flag_reviews (
    indicator TEXT NOT NULL,
    mission_day INTEGER NOT NULL,
    review_status TEXT NOT NULL CHECK (review_status IN ('open', 'reviewed', 'follow_up')),
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (indicator, mission_day),
    FOREIGN KEY (indicator, mission_day) REFERENCES readings(indicator, mission_day)
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _ensure_data_profile_column(conn):
    # Migration for databases created before data_profile existed (SQLite has
    # no "ADD COLUMN IF NOT EXISTS", so probe and swallow the redundant case).
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(mission)")}
    if "data_profile" not in cols:
        conn.execute("ALTER TABLE mission ADD COLUMN data_profile TEXT")


def init_db(astronaut_name: str = "Commander Rayyan"):
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        _ensure_data_profile_column(conn)
        row = conn.execute("SELECT id FROM mission WHERE id = 1").fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO mission (id, astronaut_name, current_day, data_profile) VALUES (1, ?, 0, NULL)",
                (astronaut_name,),
            )


def reset_db(astronaut_name: str = "Commander Rayyan", data_profile: str | None = None):
    with get_conn() as conn:
        conn.execute("BEGIN IMMEDIATE")
        _ensure_data_profile_column(conn)
        conn.execute("DELETE FROM flag_reviews")
        conn.execute("DELETE FROM check_ins")
        conn.execute("DELETE FROM readings")
        conn.execute("DELETE FROM mission")
        conn.execute(
            "INSERT INTO mission (id, astronaut_name, current_day, data_profile) VALUES (1, ?, 0, ?)",
            (astronaut_name, data_profile),
        )


def get_mission(conn) -> sqlite3.Row:
    return conn.execute("SELECT * FROM mission WHERE id = 1").fetchone()


def set_mission_day(conn, day: int):
    conn.execute("UPDATE mission SET current_day = ? WHERE id = 1", (day,))


def insert_reading(
    conn,
    indicator: str,
    mission_day: int,
    value: float,
    injected_anomaly: str | None,
    is_flagged: bool,
    anomaly_score: float | None,
):
    conn.execute(
        """INSERT INTO readings
           (indicator, mission_day, value, injected_anomaly, is_flagged, anomaly_score)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(indicator, mission_day) DO UPDATE SET
             value=excluded.value,
             injected_anomaly=excluded.injected_anomaly,
             is_flagged=excluded.is_flagged,
             anomaly_score=excluded.anomaly_score""",
        (indicator, mission_day, value, injected_anomaly, int(is_flagged), anomaly_score),
    )


def get_history(conn, indicator: str, limit_days: int | None = None) -> list[sqlite3.Row]:
    q = "SELECT * FROM readings WHERE indicator = ? ORDER BY mission_day ASC"
    rows = conn.execute(q, (indicator,)).fetchall()
    if limit_days is not None and len(rows) > limit_days:
        rows = rows[-limit_days:]
    return rows


def get_all_flags(conn) -> list[sqlite3.Row]:
    return conn.execute(
        """SELECT r.*, COALESCE(f.review_status, 'open') AS review_status,
                  COALESCE(f.review_note, '') AS review_note, f.reviewed_at
           FROM readings r LEFT JOIN flag_reviews f
             ON r.indicator = f.indicator AND r.mission_day = f.mission_day
           WHERE r.is_flagged = 1 ORDER BY r.mission_day DESC, r.indicator"""
    ).fetchall()


def get_check_ins(conn) -> list[dict]:
    return [dict(row) for row in conn.execute(
        "SELECT mission_day AS day, mood, energy, stress, sleep_quality, notes, updated_at "
        "FROM check_ins ORDER BY mission_day DESC"
    )]
