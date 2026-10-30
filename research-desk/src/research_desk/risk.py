from dataclasses import dataclass
from enum import Enum


class Decision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


@dataclass(frozen=True)
class ProposedPaperTrade:
    market: str
    instrument: str
    asset_type: str
    side: str
    entry: float
    stop: float
    quantity: float
    equity_usd: float
    open_positions: int = 0
    realized_daily_pnl_usd: float = 0.0
    data_timestamp: str | None = None
    quote_is_executable: bool = False


@dataclass(frozen=True)
class RiskDecision:
    decision: Decision
    reason: str
    risk_usd: float = 0.0
    notional_usd: float = 0.0


def evaluate_trade(trade: ProposedPaperTrade, *, risk_pct: float = 0.01, daily_loss_pct: float = 0.03, max_positions: int = 3, options_enabled: bool = False) -> RiskDecision:
    """Fail-closed paper risk gate. It never submits or simulates an order."""
    if trade.asset_type.strip().lower() in {"option", "options"} and not options_enabled:
        return RiskDecision(Decision.REJECT, "OPTIONS_PROHIBITED")
    if not trade.quote_is_executable or not trade.data_timestamp:
        return RiskDecision(Decision.REJECT, "MISSING_EXECUTABLE_TIMESTAMPED_QUOTE")
    if trade.market.strip().lower() not in {"crypto", "us_equities", "us_etf", "forex", "commodities", "ngx"}:
        return RiskDecision(Decision.REJECT, "UNSUPPORTED_MARKET")
    if trade.side.lower() not in {"buy", "sell", "long", "short"}:
        return RiskDecision(Decision.REJECT, "INVALID_SIDE")
    if trade.equity_usd <= 0 or trade.entry <= 0 or trade.stop <= 0 or trade.quantity <= 0:
        return RiskDecision(Decision.REJECT, "INVALID_TRADE_VALUES")
    if trade.open_positions >= max_positions:
        return RiskDecision(Decision.REJECT, "MAX_OPEN_POSITIONS_REACHED")
    if trade.realized_daily_pnl_usd <= -(trade.equity_usd * daily_loss_pct):
        return RiskDecision(Decision.REJECT, "DAILY_LOSS_LIMIT_REACHED")
    distance = abs(trade.entry - trade.stop)
    if distance <= 0:
        return RiskDecision(Decision.REJECT, "STOP_MUST_DIFFER_FROM_ENTRY")
    risk = distance * trade.quantity
    budget = trade.equity_usd * risk_pct
    notional = trade.entry * trade.quantity
    if risk > budget + 1e-9:
        return RiskDecision(Decision.REJECT, "RISK_BUDGET_EXCEEDED", round(risk, 2), round(notional, 2))
    return RiskDecision(Decision.APPROVE, "PAPER_RISK_CHECK_PASSED", round(risk, 2), round(notional, 2))
