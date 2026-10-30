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


@dataclass(frozen=True)
class WalkForwardWindow:
    train_start: int
    train_end: int
    test_start: int
    test_end: int


@dataclass(frozen=True)
class StrategyScore:
    out_of_sample_sharpe: int
    max_drawdown: int
    trade_count: int
    edge_after_costs: int
    walk_forward_stability: int
    total: int
    eligible_for_review: bool
    rubric: str = "scorecard-v1"


def monte_carlo_max_drawdown(
    trade_returns: Sequence[float],
    *,
    simulations: int = 1000,
    seed: int = 7,
) -> MonteCarloDrawdown:
    """Bootstrap out-of-sample net trade returns; this is not a forecast."""
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
            equity *= 1 + trade_returns[rng.randrange(count)]
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


def walk_forward_windows(
    total_bars: int,
    *,
    train_bars: int,
    test_bars: int,
    step_bars: int | None = None,
) -> tuple[WalkForwardWindow, ...]:
    """Return chronological, non-lookahead train/test windows."""
    step = test_bars if step_bars is None else step_bars
    if total_bars <= 0 or train_bars <= 0 or test_bars <= 0 or step <= 0:
        raise ValueError("All window sizes must be positive")
    windows = []
    start = 0
    while start + train_bars + test_bars <= total_bars:
        train_end = start + train_bars
        test_end = train_end + test_bars
        windows.append(WalkForwardWindow(start, train_end, train_end, test_end))
        start += step
    return tuple(windows)


def score_strategy(
    *,
    out_of_sample_sharpe: float,
    max_drawdown: float,
    trade_count: int,
    expectancy_r_after_costs: float,
    positive_walk_forward_folds: int,
    total_walk_forward_folds: int,
) -> StrategyScore:
    """Pre-registered 1–5 rubric. A passing score is a review gate, not proof."""
    if not all(isfinite(x) for x in (out_of_sample_sharpe, max_drawdown, expectancy_r_after_costs)):
        raise ValueError("Score inputs must be finite")
    if max_drawdown < 0 or trade_count < 0 or total_walk_forward_folds <= 0:
        raise ValueError("Invalid drawdown, trade count or walk-forward fold count")
    if positive_walk_forward_folds < 0 or positive_walk_forward_folds > total_walk_forward_folds:
        raise ValueError("Positive fold count must be within total fold count")

    sharpe_score = 5 if out_of_sample_sharpe >= 2 else 4 if out_of_sample_sharpe >= 1.5 else 3 if out_of_sample_sharpe >= 1 else 2 if out_of_sample_sharpe >= 0.5 else 1
    drawdown_score = 5 if max_drawdown <= 0.05 else 4 if max_drawdown <= 0.10 else 3 if max_drawdown <= 0.15 else 2 if max_drawdown <= 0.20 else 1
    count_score = 5 if trade_count >= 100 else 4 if trade_count >= 60 else 3 if trade_count >= 30 else 2 if trade_count >= 20 else 1
    edge_score = 5 if expectancy_r_after_costs >= 0.5 else 4 if expectancy_r_after_costs >= 0.3 else 3 if expectancy_r_after_costs >= 0.15 else 2 if expectancy_r_after_costs > 0 else 1
    stability = positive_walk_forward_folds / total_walk_forward_folds
    stability_score = 5 if stability >= 0.9 else 4 if stability >= 0.75 else 3 if stability >= 0.6 else 2 if stability >= 0.5 else 1
    total = sharpe_score + drawdown_score + count_score + edge_score + stability_score
    return StrategyScore(
        sharpe_score, drawdown_score, count_score, edge_score, stability_score,
        total, total >= 18 and trade_count >= 30,
    )
