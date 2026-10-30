import pytest
from research_desk.evaluation import monte_carlo_max_drawdown, score_strategy, walk_forward_windows


def test_monte_carlo_is_reproducible_and_reports_tail_drawdown():
    returns = [0.02, -0.01, 0.015, -0.025, 0.01, -0.005] * 5
    first = monte_carlo_max_drawdown(returns, simulations=1000, seed=42)
    second = monte_carlo_max_drawdown(returns, simulations=1000, seed=42)
    assert first == second
    assert first.simulations == 1000
    assert first.percentile_99_max_drawdown >= first.median_max_drawdown


def test_monte_carlo_rejects_empty_or_impossible_returns():
    with pytest.raises(ValueError):
        monte_carlo_max_drawdown([])
    with pytest.raises(ValueError):
        monte_carlo_max_drawdown([-1.0])


def test_walk_forward_windows_are_chronological_and_non_overlapping():
    windows = walk_forward_windows(100, train_bars=50, test_bars=10)
    assert windows[0].train_start == 0
    assert windows[0].train_end == windows[0].test_start
    assert windows[0].test_end == 60
    assert windows[1].test_start == windows[0].test_end


def test_scorecard_requires_minimum_trade_count_even_with_high_score():
    score = score_strategy(
        out_of_sample_sharpe=2.2, max_drawdown=0.04, trade_count=18,
        expectancy_r_after_costs=0.6, positive_walk_forward_folds=10,
        total_walk_forward_folds=10,
    )
    assert score.total >= 18
    assert not score.eligible_for_review


def test_scorecard_passes_only_with_score_and_trade_floor():
    score = score_strategy(
        out_of_sample_sharpe=2.2, max_drawdown=0.04, trade_count=100,
        expectancy_r_after_costs=0.6, positive_walk_forward_folds=10,
        total_walk_forward_folds=10,
    )
    assert score.total == 25
    assert score.eligible_for_review
