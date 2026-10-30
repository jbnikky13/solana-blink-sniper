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
