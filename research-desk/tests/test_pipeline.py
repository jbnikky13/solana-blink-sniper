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


@pytest.mark.asyncio
async def test_scout_persists_public_crypto_bars_when_configured(tmp_path, monkeypatch):
    from datetime import datetime, timezone
    from research_desk import ccxt_provider
    from research_desk.config import settings
    from research_desk.market_data import MarketBar

    monkeypatch.setattr(state, "DB_PATH", tmp_path / "desk.sqlite3")
    monkeypatch.setattr(settings, "crypto_exchange_id", "mockexchange")
    monkeypatch.setattr(settings, "crypto_symbols", "BTC/USDT")
    monkeypatch.setattr(settings, "crypto_timeframe", "1h")
    monkeypatch.setattr(settings, "crypto_bar_limit", 100)

    class FakeProvider:
        def __init__(self, exchange_id):
            assert exchange_id == "mockexchange"

        async def fetch_bars(self, symbol, timeframe, limit):
            timestamp = datetime(2026, 10, 30, 7, 0, tzinfo=timezone.utc)
            return [MarketBar(
                market="crypto", symbol=symbol, timeframe=timeframe,
                timestamp=timestamp, received_at=timestamp,
                open=100.0, high=102.0, low=99.0, close=101.0, volume=5.0,
                currency="USDT", source="ccxt:mockexchange",
            )]

    monkeypatch.setattr(ccxt_provider, "PublicCryptoDataProvider", FakeProvider)
    result = await pipeline.scout()
    assert "PARTIAL_DATA" in result
    assert state.count_market_bars("crypto") == 1
