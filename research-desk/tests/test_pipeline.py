from research_desk import pipeline
from research_desk import state
from research_desk.config import settings


def test_pipeline_does_not_invent_signals(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    monkeypatch.setattr(settings, "market_data_provider", "none")
    result = pipeline.scout()
    assert "DATA_NOT_CONFIGURED" in result
    assert "No prices" in result
    assert state.recent_jobs(1)[0]["status"] == "DATA_NOT_CONFIGURED"
