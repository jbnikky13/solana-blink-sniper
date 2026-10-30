from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable


@dataclass(frozen=True)
class MarketBar:
    market: str
    symbol: str
    timeframe: str
    timestamp: datetime
    received_at: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    currency: str
    source: str
    adjusted: bool = False


@dataclass(frozen=True)
class ValidationReport:
    valid: bool
    errors: tuple[str, ...]
    bars_checked: int


def validate_bars(
    bars: Iterable[MarketBar],
    *,
    now: datetime | None = None,
    max_age_seconds: int | None = None,
) -> ValidationReport:
    rows = list(bars)
    errors: list[str] = []
    if not rows:
        return ValidationReport(False, ("EMPTY_DATASET",), 0)

    previous_timestamp: datetime | None = None
    now_utc = now or datetime.now(timezone.utc)
    if now_utc.tzinfo is None:
        return ValidationReport(False, ("VALIDATION_CLOCK_MUST_BE_TIMEZONE_AWARE",), len(rows))

    for index, bar in enumerate(rows):
        prefix = f"BAR_{index}"
        if not bar.market or not bar.symbol or not bar.timeframe or not bar.source or not bar.currency:
            errors.append(f"{prefix}_MISSING_METADATA")
        if bar.timestamp.tzinfo is None or bar.received_at.tzinfo is None:
            errors.append(f"{prefix}_TIMEZONE_MISSING")
            continue
        timestamp = bar.timestamp.astimezone(timezone.utc)
        received_at = bar.received_at.astimezone(timezone.utc)
        if previous_timestamp is not None and timestamp <= previous_timestamp:
            errors.append(f"{prefix}_DUPLICATE_OR_OUT_OF_ORDER_TIMESTAMP")
        previous_timestamp = timestamp
        if received_at < timestamp:
            errors.append(f"{prefix}_RECEIVED_BEFORE_SOURCE_TIMESTAMP")
        prices = (bar.open, bar.high, bar.low, bar.close)
        if any(price <= 0 for price in prices):
            errors.append(f"{prefix}_NON_POSITIVE_PRICE")
        elif bar.high < max(bar.open, bar.close, bar.low) or bar.low > min(bar.open, bar.close, bar.high):
            errors.append(f"{prefix}_INVALID_OHLC_RANGE")
        if bar.volume < 0:
            errors.append(f"{prefix}_NEGATIVE_VOLUME")
        if max_age_seconds is not None and (now_utc.astimezone(timezone.utc) - timestamp).total_seconds() > max_age_seconds:
            errors.append(f"{prefix}_STALE_BAR")

    return ValidationReport(not errors, tuple(errors), len(rows))
