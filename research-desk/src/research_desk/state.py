import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(os.getenv("RESEARCH_DESK_DB", "data/research_desk.sqlite3"))


@contextmanager
def connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def initialize() -> None:
    with connection() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS controls (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            paused INTEGER NOT NULL DEFAULT 0,
            killed INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        db.execute("INSERT OR IGNORE INTO controls (id, paused, killed) VALUES (1, 0, 0)")
        db.execute("""CREATE TABLE IF NOT EXISTS job_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_name TEXT NOT NULL,
            status TEXT NOT NULL,
            detail TEXT NOT NULL,
            started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")


def get_controls() -> dict:
    initialize()
    with connection() as db:
        row = db.execute("SELECT paused, killed FROM controls WHERE id=1").fetchone()
        return {"paused": bool(row["paused"]), "killed": bool(row["killed"])}


def set_paused(value: bool) -> None:
    initialize()
    with connection() as db:
        db.execute("UPDATE controls SET paused=?, updated_at=CURRENT_TIMESTAMP WHERE id=1", (int(value),))


def activate_kill() -> None:
    initialize()
    with connection() as db:
        db.execute("UPDATE controls SET paused=1, killed=1, updated_at=CURRENT_TIMESTAMP WHERE id=1")


def record_job(job_name: str, status: str, detail: str) -> None:
    initialize()
    with connection() as db:
        db.execute("INSERT INTO job_runs (job_name, status, detail) VALUES (?, ?, ?)", (job_name, status, detail[:4000]))


def recent_jobs(limit: int = 10) -> list[dict]:
    initialize()
    with connection() as db:
        rows = db.execute("SELECT job_name, status, detail, started_at FROM job_runs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(row) for row in rows]
