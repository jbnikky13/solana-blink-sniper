from dataclasses import dataclass
from math import isfinite
import random
from typing import Sequence


@dataclass(frozen=True)
class MonteCarloDrawdown:
    simulations: int
    trades_per_path: int
    median_max_drawdown: float
    percentile_95_max_drawdown: float
    percentile_99_max_drawdown: float


def monte_carlo_max_drawdown(
    trade_returns: Sequence[float],
    *,
    simulations: int = 1000,
    seed: int = 7,
) -> MonteCarloDrawdown:
    """Bootstrap trade returns with replacement and report max-drawdown quantiles.

    Supply out-of-sample net trade returns only. This is a resampling diagnostic,
    not a forecast and not a substitute for regime-aware stress testing.
    """
    if not trade_returns:
        raise ValueError("At least one out-of-sample trade return is required")
    if simulations < 100:
        raise ValueError("At least 100 simulations are required")
    if any(not isfinite(value) or value <= -1 for value in trade_returns):
        raise ValueError("Trade returns must be finite and greater than -100%")

    rng = random.Random(seed)
    drawdowns: list[float] = []
    count = len(trade_returns)
    for _ in range(simulations):
        equity = 1.0
        peak = 1.0
        worst = 0.0
        for _ in range(count):
            value = trade_returns[rng.randrange(count)]
            equity *= 1 + value
            peak = max(peak, equity)
            if peak > 0:
                worst = max(worst, (peak - equity) / peak)
        drawdowns.append(worst)

    ordered = sorted(drawdowns)
    def percentile(p: float) -> float:
        index = min(len(ordered) - 1, max(0, int(round((len(ordered) - 1) * p))))
        return ordered[index]

    return MonteCarloDrawdown(
        simulations=simulations,
        trades_per_path=count,
        median_max_drawdown=percentile(0.50),
        percentile_95_max_drawdown=percentile(0.95),
        percentile_99_max_drawdown=percentile(0.99),
    )
