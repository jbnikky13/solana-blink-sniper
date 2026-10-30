import pytest
from research_desk.evaluation import monte_carlo_max_drawdown


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
