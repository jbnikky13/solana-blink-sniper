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
    """Signal is observed at bar close; fills occur at the next bar open.

    This deliberately small baseline avoids same-bar lookahead. It is a
    research primitive, not a production broker fill simulator.
    """
    validation = validate_bars(bars)
    if not validation.valid:
        return BacktestResult("REJECTED", ",".join(validation.errors), len(bars))
    if len(bars) < 3:
        return BacktestResult("REJECTED", "INSUFFICIENT_BARS", len(bars))
    if fee_bps_per_side < 0 or slippage_bps_per_side < 0 or periods_per_year <= 0:
        return BacktestResult("REJECTED", "INVALID_COST_OR_ANNUALIZATION_INPUT", len(bars))

    friction = 2 * (fee_bps_per_side + slippage_bps_per_side) / 10000
    position = 0
    entry_price = 0.0
    entry_time = ""
    trades: list[TradeResult] = []
    equity = 1.0
    peak = 1.0
    max_drawdown = 0.0
    periodic_returns: list[float] = []
    previous_equity = equity

    for index in range(len(bars) - 1):
        desired = int(signal(bars, index))
        if desired not in {-1, 0, 1}:
            return BacktestResult("REJECTED", "SIGNAL_MUST_BE_MINUS_ONE_ZERO_OR_ONE", len(bars))
        fill_bar = bars[index + 1]
        fill_price = fill_bar.open
        if desired != position:
            if position:
                gross = position * (fill_price / entry_price - 1)
                net = gross - friction
                equity *= max(0.0, 1 + net)
                trades.append(TradeResult(position, entry_time, fill_bar.timestamp.isoformat(), entry_price, fill_price, net))
            position = desired
            if position:
                entry_price = fill_price
                entry_time = fill_bar.timestamp.isoformat()
        if equity <= 0:
            return BacktestResult("REJECTED", "EQUITY_DEPLETED", len(bars), tuple(trades), -1.0, 1.0, 0.0)
        peak = max(peak, equity)
        max_drawdown = max(max_drawdown, (peak - equity) / peak)
        periodic_returns.append(equity / previous_equity - 1)
        previous_equity = equity

    if position:
        last_bar = bars[-1]
        gross = position * (last_bar.close / entry_price - 1)
        net = gross - friction
        equity *= max(0.0, 1 + net)
        trades.append(TradeResult(position, entry_time, last_bar.timestamp.isoformat(), entry_price, last_bar.close, net))
        peak = max(peak, equity)
        max_drawdown = max(max_drawdown, (peak - equity) / peak)

    mean = sum(periodic_returns) / len(periodic_returns) if periodic_returns else 0.0
    variance = sum((value - mean) ** 2 for value in periodic_returns) / max(1, len(periodic_returns) - 1)
    deviation = sqrt(variance)
    sharpe = (mean / deviation) * sqrt(periods_per_year) if deviation else 0.0
    return BacktestResult("COMPLETED", "SYNTHETIC_OR_SUPPLIED_DATA_ONLY; VALIDATION_REQUIRED", len(bars), tuple(trades), equity - 1, max_drawdown, sharpe)
