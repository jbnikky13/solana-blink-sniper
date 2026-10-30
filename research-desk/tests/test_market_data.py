from datetime import datetime, timedelta, timezone
from research_desk.market_data import MarketBar, validate_bars


NOW = datetime(2026, 10, 30, 8, 0, tzinfo=timezone.utc)


def bar(**overrides):
    values = dict(
        market="crypto", symbol="BTC/USDT", timeframe="1h",
        timestamp=NOW - timedelta(hours=1), received_at=NOW - timedelta(minutes=59),
        open=100.0, high=105.0, low=98.0, close=103.0, volume=12.0,
        currency="USDT", source="test-fixture", adjusted=False,
    )
    values.update(overrides)
    return MarketBar(**values)


def test_accepts_valid_ohlcv_bar():
    report = validate_bars([bar()], now=NOW, max_age_seconds=7200)
    assert report.valid
    assert report.bars_checked == 1


def test_rejects_stale_bar():
    report = validate_bars([bar(timestamp=NOW - timedelta(days=2), received_at=NOW - timedelta(days=2))], now=NOW, max_age_seconds=3600)
    assert "BAR_0_STALE_BAR" in report.errors


def test_rejects_invalid_ohlc():
    report = validate_bars([bar(high=99.0)], now=NOW)
    assert "BAR_0_INVALID_OHLC_RANGE" in report.errors


def test_rejects_duplicate_or_out_of_order_timestamps():
    first = bar()
    second = bar(timestamp=first.timestamp, received_at=first.received_at)
    report = validate_bars([first, second], now=NOW)
    assert "BAR_1_DUPLICATE_OR_OUT_OF_ORDER_TIMESTAMP" in report.errors


def test_rejects_naive_timestamps():
    report = validate_bars([bar(timestamp=datetime(2026, 10, 30, 7, 0), received_at=NOW)], now=NOW)
    assert "BAR_0_TIMEZONE_MISSING" in report.errors


def test_rejects_future_dated_bar():
    report = validate_bars([bar(timestamp=NOW + timedelta(minutes=1), received_at=NOW + timedelta(minutes=2))], now=NOW)
    assert "BAR_0_FUTURE_SOURCE_TIMESTAMP" in report.errors
