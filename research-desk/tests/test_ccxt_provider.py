from datetime import datetime, timedelta, timezone

import pytest
import ccxt.async_support as ccxt

from research_desk.ccxt_provider import PublicCryptoDataProvider


class FakeExchange:
    def __init__(self, config):
        self.config = config
        self.has = {"fetchOHLCV": True}
        self.closed = False
        now = datetime.now(timezone.utc)
        self.rows = [
            [int((now - timedelta(hours=3)).timestamp() * 1000), 100, 102, 99, 101, 10],
            [int((now - timedelta(hours=2)).timestamp() * 1000), 101, 103, 100, 102, 11],
            [int((now - timedelta(minutes=5)).timestamp() * 1000), 102, 104, 101, 103, 12],
        ]

    async def load_markets(self):
        return None

    def market(self, symbol):
        return {"symbol": symbol, "spot": True, "contract": False, "active": True, "quote": "USDT"}

    def parse_timeframe(self, timeframe):
        return 3600

    async def fetch_ohlcv(self, symbol, timeframe, limit):
        return self.rows

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_ccxt_adapter_keeps_closed_spot_bars_and_closes_client(monkeypatch):
    fake = FakeExchange({})
    monkeypatch.setattr(ccxt, "binance", lambda config: fake)
    provider = PublicCryptoDataProvider("binance")
    bars = await provider.fetch_bars("BTC/USDT", "1h", 100)
    assert len(bars) == 2
    assert bars[-1].close == 102
    assert bars[0].source == "ccxt:binance"
    assert fake.closed


@pytest.mark.asyncio
async def test_ccxt_adapter_rejects_non_spot_market(monkeypatch):
    fake = FakeExchange({})
    fake.market = lambda symbol: {"symbol": symbol, "spot": False, "contract": True, "quote": "USDT"}
    monkeypatch.setattr(ccxt, "binance", lambda config: fake)
    provider = PublicCryptoDataProvider("binance")
    with pytest.raises(ValueError, match="Only spot markets"):
        await provider.fetch_bars("BTC/USDT", "1h", 100)
    assert fake.closed
