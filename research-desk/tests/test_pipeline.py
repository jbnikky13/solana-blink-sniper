import pytest
from research_desk import pipeline
from research_desk import state


@pytest.mark.asyncio
async def test_pipeline_agent_reports_no_data_without_provider(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    result = await pipeline.scout()
    assert "DATA_NOT_CONFIGURED" in result
    assert "not connected" in result.lower()
    assert state.recent_jobs(1)[0]["status"] == "DATA_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_paused_pipeline_does_not_call_agent(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    state.set_paused(True)
    result = await pipeline.scout()
    assert "PAUSED" in result
    assert state.recent_jobs(1)[0]["status"] == "PAUSED"


@pytest.mark.asyncio
async def test_kill_switch_blocks_pipeline(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    state.activate_kill()
    result = await pipeline.builder()
    assert "KILLED" in result
    assert state.recent_jobs(1)[0]["status"] == "KILLED"
