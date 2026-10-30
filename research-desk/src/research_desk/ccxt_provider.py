from datetime import datetime, timezone
from typing import Any

import ccxt.async_support as ccxt

from .market_data import MarketBar, validate_bars


class PublicCryptoDataProvider:
    """Read-only CCXT spot OHLCV adapter. No API keys or trading methods."""

    def __init__(self, exchange_id: str):
        exchange_class = getattr(ccxt, exchange_id, None)
        if exchange_class is None:
            raise ValueError(f"Unsupported CCXT exchange id: {exchange_id}")
        self.exchange = exchange_class({"enableRateLimit": True})
        self.exchange_id = exchange_id

    async def fetch_bars(self, symbol: str, timeframe: str = "1h", limit: int = 500) -> list[MarketBar]:
        if limit < 3 or limit > 1000:
            raise ValueError("OHLCV limit must be between 3 and 1000")
        try:
            await self.exchange.load_markets()
            market: dict[str, Any] = self.exchange.market(symbol)
            if market.get("spot") is not True or market.get("contract") is True:
                raise ValueError("Only spot markets are supported by this public-data adapter")
            if market.get("active") is False:
                raise ValueError("Exchange reports this spot market as inactive")
            if not self.exchange.has.get("fetchOHLCV"):
                raise ValueError("This exchange does not expose unified OHLCV data")

            raw = await self.exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            received_at = datetime.now(timezone.utc)
            seconds = self.exchange.parse_timeframe(timeframe)
            now_seconds = received_at.timestamp()
            closed_rows = [row for row in raw if (int(row[0]) / 1000) + seconds <= now_seconds]
            bars = [
                MarketBar(
                    market="crypto",
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp=datetime.fromtimestamp(int(row[0]) / 1000, timezone.utc),
                    received_at=received_at,
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=float(row[5]),
                    currency=str(market.get("quote") or ""),
                    source=f"ccxt:{self.exchange_id}",
                    adjusted=False,
                )
                for row in closed_rows
            ]
            report = validate_bars(bars, now=received_at)
            if not report.valid:
                raise ValueError("Invalid exchange OHLCV response: " + ",".join(report.errors))
            return bars
        finally:
            await self.exchange.close()
