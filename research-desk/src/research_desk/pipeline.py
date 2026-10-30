import json
from agenkit import Message
from .agents import SCOUT, QUANT, BUILDER
from .state import get_controls, record_job, save_market_bars
from .config import settings

AGENTS = {"SCOUT": SCOUT, "QUANT": QUANT, "BUILDER": BUILDER}


async def run_stage(stage: str) -> str:
    controls = get_controls()
    if controls["killed"]:
        status, detail = "KILLED", "Kill switch active; stage not run."
    elif controls["paused"]:
        status, detail = "PAUSED", "Operator pause active; stage not run."
    elif stage in AGENTS:
        response = await AGENTS[stage].process(
            Message(role="user", content=json.dumps({"task": stage, "mode": "paper-only"}))
        )
        try:
            result = json.loads(response.content)
            status = result.get("status", "AGENT_RESPONSE_INVALID")
            detail = result.get("reason", "Agent returned no explanatory status.")
        except (TypeError, ValueError):
            status, detail = "AGENT_RESPONSE_INVALID", "Agent returned an invalid response; fail closed."
    else:
        status, detail = "DATA_NOT_CONFIGURED", "No verified providers, backtesting engine or persistent paper ledger are connected."
    record_job(stage, status, detail)
    return f"{stage}: {status}\n{detail}"


async def scout() -> str:
    controls = get_controls()
    if controls["killed"] or controls["paused"]:
        return await run_stage("SCOUT")

    symbols = [item.strip() for item in settings.crypto_symbols.split(",") if item.strip()]
    if not settings.crypto_exchange_id or not symbols:
        return await run_stage("SCOUT")

    from .ccxt_provider import PublicCryptoDataProvider

    stored = 0
    errors = []
    for symbol in symbols:
        try:
            provider = PublicCryptoDataProvider(settings.crypto_exchange_id)
            bars = await provider.fetch_bars(
                symbol, timeframe=settings.crypto_timeframe, limit=settings.crypto_bar_limit
            )
            stored += save_market_bars(bars)
        except Exception as exc:
            errors.append(f"{symbol}:{type(exc).__name__}")

    if stored:
        status = "PARTIAL_DATA"
        detail = (
            f"Stored {stored} closed crypto OHLCV bars from ccxt:{settings.crypto_exchange_id}. "
            "Macro, news, filings, other markets and strategy research are not yet connected."
        )
    else:
        status = "PROVIDER_ERROR" if errors else "NO_CLOSED_BARS"
        detail = "No usable crypto bars stored. " + (", ".join(errors) if errors else "Provider returned no closed candles.")
    record_job("SCOUT", status, detail)
    return f"SCOUT: {status}\n{detail}"


async def quant() -> str:
    return await run_stage("QUANT")


async def builder() -> str:
    return await run_stage("BUILDER")


async def independent_review() -> str:
    return await run_stage("INDEPENDENT_REVIEW")


async def morning_brief() -> str:
    return await run_stage("MORNING_BRIEF")


async def weekly_review() -> str:
    return await run_stage("WEEKLY_REVIEW")
