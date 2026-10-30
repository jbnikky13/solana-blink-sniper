from research_desk.risk import Decision, ProposedPaperTrade, evaluate_trade


def proposal(**overrides):
    values = dict(market="crypto", instrument="BTC-USD", asset_type="spot", side="buy", entry=100.0, stop=99.0, quantity=10.0, equity_usd=1000.0, data_timestamp="2026-10-30T01:00:00Z", quote_is_executable=True)
    values.update(overrides)
    return ProposedPaperTrade(**values)


def test_rejects_options():
    result = evaluate_trade(proposal(asset_type="options"))
    assert result.decision is Decision.REJECT
    assert result.reason == "OPTIONS_PROHIBITED"


def test_rejects_missing_quote():
    result = evaluate_trade(proposal(quote_is_executable=False))
    assert result.reason == "MISSING_EXECUTABLE_TIMESTAMPED_QUOTE"


def test_rejects_risk_over_ten_dollars():
    result = evaluate_trade(proposal(quantity=11.0))
    assert result.decision is Decision.REJECT
    assert result.reason == "RISK_BUDGET_EXCEEDED"


def test_approves_trade_within_one_percent_risk():
    result = evaluate_trade(proposal(quantity=10.0))
    assert result.decision is Decision.APPROVE
    assert result.risk_usd == 10.0


def test_daily_loss_halt():
    result = evaluate_trade(proposal(realized_daily_pnl_usd=-30.0))
    assert result.reason == "DAILY_LOSS_LIMIT_REACHED"


def test_position_limit():
    result = evaluate_trade(proposal(open_positions=3))
    assert result.reason == "MAX_OPEN_POSITIONS_REACHED"
