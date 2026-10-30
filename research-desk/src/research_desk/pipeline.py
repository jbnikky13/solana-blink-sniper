from .config import settings
from .state import get_controls, record_job


def run_stage(stage: str) -> str:
    controls = get_controls()
    if controls["killed"]:
        status, detail = "KILLED", "Kill switch active; stage not run."
    elif controls["paused"]:
        status, detail = "PAUSED", "Operator pause active; stage not run."
    elif settings.market_data_provider.strip().lower() in {"", "none"}:
        status, detail = "DATA_NOT_CONFIGURED", "No verified market-data provider configured. No prices, signals, backtests or trades generated."
    else:
        # Provider integrations must be implemented and independently validated before this branch changes.
        status, detail = "ADAPTER_NOT_IMPLEMENTED", "Provider adapter is not implemented. Fail closed; no signal or trade."
    record_job(stage, status, detail)
    return f"{stage}: {status}\n{detail}"


def scout() -> str:
    return run_stage("SCOUT")


def quant() -> str:
    return run_stage("QUANT")


def builder() -> str:
    return run_stage("BUILDER")


def independent_review() -> str:
    return run_stage("INDEPENDENT_REVIEW")


def morning_brief() -> str:
    return run_stage("MORNING_BRIEF")


def weekly_review() -> str:
    return run_stage("WEEKLY_REVIEW")
