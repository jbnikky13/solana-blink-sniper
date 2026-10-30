from dataclasses import dataclass


@dataclass(frozen=True)
class HypothesisTemplate:
    key: str
    family: str
    thesis: str
    required_evidence: tuple[str, ...]
    holding_period: str
    primary_failure_mode: str


HYPOTHESIS_TEMPLATES = (
    HypothesisTemplate("earnings_drift", "event_momentum", "Post-earnings repricing may persist when the surprise is material and guidance changes.", ("earnings_calendar", "surprise_history", "adjusted_ohlcv", "spread"), "swing", "Look-ahead in earnings timestamps or corporate-action adjustments."),
    HypothesisTemplate("news_momentum", "event_momentum", "Verified material news may produce short-lived continuation after the initial repricing.", ("timestamped_news", "source_quality", "intraday_ohlcv", "spread"), "intraday", "Headline timestamp mismatch, duplicated stories or late entry."),
    HypothesisTemplate("mean_reversion", "mean_reversion", "Extreme deviations from a stable reference may revert when liquidity remains adequate.", ("ohlcv", "volatility", "liquidity", "spread"), "intraday_or_swing", "Structural trend change or apparent reversion caused by stale prices."),
    HypothesisTemplate("sector_rotation", "relative_strength", "Persistent relative strength across sectors may continue during stable macro regimes.", ("sector_constituents", "adjusted_ohlcv", "macro_regime"), "swing", "Constituent survivorship bias or sector classification changes."),
    HypothesisTemplate("volatility_regime_shift", "regime", "A transition in realized volatility may alter which trend or reversion rules work.", ("ohlcv", "realized_volatility", "event_calendar"), "intraday_or_swing", "Regime labels use future information or shift too slowly."),
    HypothesisTemplate("trend_pullback", "trend", "Pullbacks within a confirmed trend may offer better entry efficiency than chasing breakouts.", ("ohlcv", "trend_filter", "spread", "volume"), "swing", "Trend filter lags or pullback is actually a reversal."),
    HypothesisTemplate("overnight_gap", "session_effect", "Gaps after closed sessions may continue or fill depending on catalyst and opening liquidity.", ("session_calendar", "adjusted_ohlcv", "news_timestamps", "opening_spread"), "intraday", "Overnight news unavailable at decision time or unrealistic opening fills."),
    HypothesisTemplate("macro_surprise_drift", "macro_event", "Price response to a macro surprise may persist when the surprise changes rate or growth expectations.", ("macro_release_calendar", "release_vintages", "timestamped_ohlcv", "rates"), "intraday_or_swing", "Revised macro data or incorrect release-time alignment."),
    HypothesisTemplate("volatility_breakout", "breakout", "Compression followed by range expansion may precede directional continuation.", ("ohlcv", "realized_volatility", "volume", "spread"), "intraday_or_swing", "False breakouts, slippage spikes or data gaps."),
    HypothesisTemplate("cross_asset_relative_value", "relative_value", "Divergence between economically linked instruments may normalize when the relationship is stable.", ("synchronized_ohlcv", "fx_conversion", "correlation_regime", "spread"), "swing", "Unstable correlation, asynchronous sessions or basis risk."),
)


def get_hypothesis_templates() -> tuple[HypothesisTemplate, ...]:
    return HYPOTHESIS_TEMPLATES
