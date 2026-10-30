import os
import sqlite3
from datetime import datetime
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
        db.execute("""CREATE TABLE IF NOT EXISTS market_bars (
            market TEXT NOT NULL, symbol TEXT NOT NULL, timeframe TEXT NOT NULL,
            timestamp TEXT NOT NULL, received_at TEXT NOT NULL,
            open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL, close REAL NOT NULL, volume REAL NOT NULL,
            currency TEXT NOT NULL, source TEXT NOT NULL, adjusted INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (market, symbol, timeframe, timestamp, source)
        )""")
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

def save_market_bars(bars) -> int:
    rows = [(
        bar.market, bar.symbol, bar.timeframe, bar.timestamp.isoformat(), bar.received_at.isoformat(),
        bar.open, bar.high, bar.low, bar.close, bar.volume, bar.currency, bar.source, int(bar.adjusted),
    ) for bar in bars]
    if not rows:
        return 0
    initialize()
    with connection() as db:
        db.executemany(
            """INSERT OR REPLACE INTO market_bars
            (market, symbol, timeframe, timestamp, received_at, open, high, low, close, volume, currency, source, adjusted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )
    return len(rows)


def load_market_bars(market: str, symbol: str, timeframe: str, limit: int = 500):
    from .market_data import MarketBar
    initialize()
    with connection() as db:
        rows = db.execute(
            """SELECT * FROM market_bars WHERE market=? AND symbol=? AND timeframe=?
            ORDER BY timestamp DESC LIMIT ?""",
            (market, symbol, timeframe, limit),
        ).fetchall()
    ordered = list(reversed(rows))
    return [MarketBar(
        market=row["market"], symbol=row["symbol"], timeframe=row["timeframe"],
        timestamp=datetime.fromisoformat(row["timestamp"]), received_at=datetime.fromisoformat(row["received_at"]),
        open=row["open"], high=row["high"], low=row["low"], close=row["close"], volume=row["volume"],
        currency=row["currency"], source=row["source"], adjusted=bool(row["adjusted"]),
    ) for row in ordered]


def count_market_bars(market: str | None = None) -> int:
    initialize()
    with connection() as db:
        if market:
            row = db.execute("SELECT COUNT(*) AS n FROM market_bars WHERE market=?", (market,)).fetchone()
        else:
            row = db.execute("SELECT COUNT(*) AS n FROM market_bars").fetchone()
        return int(row["n"])
