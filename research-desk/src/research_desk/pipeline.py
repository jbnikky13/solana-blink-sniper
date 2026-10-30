import json
from agenkit import Message
from .agents import SCOUT, QUANT, BUILDER
from .state import get_controls, record_job

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
    return await run_stage("SCOUT")


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
