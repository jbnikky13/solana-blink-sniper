from research_desk import state


def test_pause_persists_and_kill_is_sticky(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    state.initialize()
    assert state.get_controls() == {"paused": False, "killed": False}
    state.set_paused(True)
    assert state.get_controls()["paused"] is True
    state.activate_kill()
    state.set_paused(False)
    assert state.get_controls() == {"paused": False, "killed": True}


def test_job_audit_is_persisted(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    state.record_job("SCOUT", "DATA_NOT_CONFIGURED", "No feed")
    assert state.recent_jobs(1)[0]["job_name"] == "SCOUT"


def test_market_bar_storage_round_trip(tmp_path, monkeypatch):
    from datetime import datetime, timezone
    from research_desk.market_data import MarketBar

    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    timestamp = datetime(2026, 10, 30, 7, 0, tzinfo=timezone.utc)
    bar = MarketBar(
        market="crypto", symbol="BTC/USDT", timeframe="1h",
        timestamp=timestamp, received_at=timestamp,
        open=100.0, high=102.0, low=99.0, close=101.0, volume=5.0,
        currency="USDT", source="test-fixture",
    )
    assert state.save_market_bars([bar]) == 1
    restored = state.load_market_bars("crypto", "BTC/USDT", "1h")
    assert restored == [bar]
    assert state.count_market_bars("crypto") == 1
