from datetime import datetime, timedelta, timezone
from research_desk.backtest import run_backtest
from research_desk.market_data import MarketBar


def make_bars(closes):
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    result = []
    previous = closes[0]
    for index, close in enumerate(closes):
        timestamp = start + timedelta(hours=index)
        result.append(MarketBar(
            market="crypto", symbol="TEST/USDT", timeframe="1h",
            timestamp=timestamp, received_at=timestamp + timedelta(seconds=1),
            open=previous, high=max(previous, close) + 0.1,
            low=min(previous, close) - 0.1, close=close, volume=100,
            currency="USDT", source="synthetic-test-fixture",
        ))
        previous = close
    return result


def test_backtest_enters_on_next_bar_and_accounts_for_costs():
    bars = make_bars([100, 100, 110, 110])
    signal = lambda history, index: 1 if index < 2 else 0
    result = run_backtest(bars, signal, fee_bps_per_side=5, slippage_bps_per_side=5, periods_per_year=24 * 365)
    assert result.status == "COMPLETED"
    assert len(result.trades) == 1
    assert result.trades[0].entry_price == 100
    assert result.trades[0].exit_price == 110
    assert result.trades[0].net_return < 0.10


def test_backtest_rejects_invalid_bar_order():
    bars = make_bars([100, 101, 102])
    bars[2] = MarketBar(**{**bars[2].__dict__, "timestamp": bars[1].timestamp})
    result = run_backtest(bars, lambda history, index: 0, fee_bps_per_side=0, slippage_bps_per_side=0, periods_per_year=365)
    assert result.status == "REJECTED"
