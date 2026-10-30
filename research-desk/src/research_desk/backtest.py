from dataclasses import dataclass
from math import sqrt
from typing import Callable, Sequence

from .market_data import MarketBar, validate_bars


SignalFunction = Callable[[Sequence[MarketBar], int], int]


@dataclass(frozen=True)
class TradeResult:
    side: int
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    net_return: float


@dataclass(frozen=True)
class BacktestResult:
    status: str
    reason: str
    bars: int
    trades: tuple[TradeResult, ...] = ()
    total_return: float = 0.0
    max_drawdown: float = 0.0
    sharpe: float = 0.0


def run_backtest(
    bars: Sequence[MarketBar],
    signal: SignalFunction,
    *,
    fee_bps_per_side: float,
    slippage_bps_per_side: float,
    periods_per_year: int,
) -> BacktestResult:
    """Observe signal at close, execute at next open, mark open risk to close.

    This is a baseline OHLC research simulator, not a broker fill simulator.
    It cannot model queue position, partial fills, intrabar stop ordering,
    market impact or venue-specific contract specifications.
    """
    validation = validate_bars(bars)
    if not validation.valid:
        return BacktestResult("REJECTED", ",".join(validation.errors), len(bars))
    if len(bars) < 3:
        return BacktestResult("REJECTED", "INSUFFICIENT_BARS", len(bars))
    if fee_bps_per_side < 0 or slippage_bps_per_side < 0 or periods_per_year <= 0:
        return BacktestResult("REJECTED", "INVALID_COST_OR_ANNUALIZATION_INPUT", len(bars))

    side_cost = (fee_bps_per_side + slippage_bps_per_side) / 10000
    realized_equity = 1.0
    marked_equity = 1.0
    previous_marked_equity = 1.0
    position = 0
    entry_price = 0.0
    entry_time = ""
    trade_start_equity = 0.0
    entry_equity = 0.0
    trades: list[TradeResult] = []
    periodic_returns: list[float] = []
    equity_curve: list[float] = []

    for index in range(len(bars) - 1):
        desired = int(signal(bars, index))
        if desired not in {-1, 0, 1}:
            return BacktestResult("REJECTED", "SIGNAL_MUST_BE_MINUS_ONE_ZERO_OR_ONE", len(bars))

        fill_bar = bars[index + 1]
        fill_price = fill_bar.open

        if desired != position:
            if position:
                gross_multiple = 1 + position * (fill_price / entry_price - 1)
                if gross_multiple <= 0:
                    return BacktestResult("REJECTED", "EQUITY_DEPLETED", len(bars), tuple(trades), -1.0, 1.0, 0.0)
                closed_equity = entry_equity * gross_multiple * (1 - side_cost)
                net_return = closed_equity / trade_start_equity - 1
                trades.append(TradeResult(position, entry_time, fill_bar.timestamp.isoformat(), entry_price, fill_price, net_return))
                realized_equity = closed_equity
                position = 0

            if desired:
                trade_start_equity = realized_equity
                entry_equity = realized_equity * (1 - side_cost)
                entry_price = fill_price
                entry_time = fill_bar.timestamp.isoformat()
                position = desired

        if position:
            gross_multiple = 1 + position * (fill_bar.close / entry_price - 1)
            if gross_multiple <= 0:
                return BacktestResult("REJECTED", "EQUITY_DEPLETED", len(bars), tuple(trades), -1.0, 1.0, 0.0)
            marked_equity = entry_equity * gross_multiple
        else:
            marked_equity = realized_equity

        if marked_equity <= 0:
            return BacktestResult("REJECTED", "EQUITY_DEPLETED", len(bars), tuple(trades), -1.0, 1.0, 0.0)
        periodic_returns.append(marked_equity / previous_marked_equity - 1)
        equity_curve.append(marked_equity)
        previous_marked_equity = marked_equity

    if position:
        last_bar = bars[-1]
        gross_multiple = 1 + position * (last_bar.close / entry_price - 1)
        if gross_multiple <= 0:
            return BacktestResult("REJECTED", "EQUITY_DEPLETED", len(bars), tuple(trades), -1.0, 1.0, 0.0)
        closed_equity = entry_equity * gross_multiple * (1 - side_cost)
        net_return = closed_equity / trade_start_equity - 1
        trades.append(TradeResult(position, entry_time, last_bar.timestamp.isoformat(), entry_price, last_bar.close, net_return))
        realized_equity = closed_equity
        marked_equity = closed_equity
        if periodic_returns:
            prior_mark = equity_curve[-2] if len(equity_curve) > 1 else 1.0
            periodic_returns[-1] = marked_equity / prior_mark - 1
            equity_curve[-1] = marked_equity

    peak = 1.0
    max_drawdown = 0.0
    for value in equity_curve:
        peak = max(peak, value)
        max_drawdown = max(max_drawdown, (peak - value) / peak)

    mean = sum(periodic_returns) / len(periodic_returns) if periodic_returns else 0.0
    variance = sum((value - mean) ** 2 for value in periodic_returns) / max(1, len(periodic_returns) - 1)
    deviation = sqrt(variance)
    sharpe = (mean / deviation) * sqrt(periods_per_year) if deviation else 0.0
    return BacktestResult(
        "COMPLETED", "SUPPLIED_DATA_ONLY; RESULTS_REQUIRE_OUT_OF_SAMPLE_REVIEW",
        len(bars), tuple(trades), realized_equity - 1, max_drawdown, sharpe,
    )
