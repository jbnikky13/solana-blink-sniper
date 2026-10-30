import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from .config import settings
from .state import activate_kill, get_controls, initialize, recent_jobs, set_paused
from .scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("research-desk")


def authorized(update: Update) -> bool:
    user = update.effective_user
    return bool(user and settings.telegram_allowed_user_id and user.id == settings.telegram_allowed_user_id)


async def reply(update: Update, text: str) -> None:
    if not authorized(update):
        if update.effective_message:
            await update.effective_message.reply_text("Unauthorized. This bot is private.")
        return
    if update.effective_message:
        await update.effective_message.reply_text(text)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "Blink-N-Snipe Research Desk\nPaper-only mode. Commands: /brief /agents /risk /status /jobs /signals /portfolio /performance /strategies /pause /resume /kill")


async def brief(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    jobs = recent_jobs(6)
    if not jobs:
        await reply(update, "No research runs recorded yet. The first scheduled collection is 01:00 WAT.")
        return
    lines = ["Recent research activity:"]
    lines.extend(f"{j['started_at']} | {j['job_name']} | {j['status']}" for j in jobs)
    lines.append("No market prices or trading signals are available until verified providers are configured.")
    await reply(update, "\n".join(lines))


async def agents(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "SCOUT: Scheduled evidence collection; data provider not configured.\nQUANT: Waiting for validated timestamped historical data.\nBUILDER: Waiting for validated strategy, independent review and paper venue.\nAll three fail closed; no signals or trades are fabricated.")


async def risk(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = "PAPER EQUITY: {0:.2f} USD\nRISK / TRADE: {1:.2f} USD (1%)\nDAILY LOSS STOP: {2:.2f} USD (3%)\nOPTIONS: PROHIBITED\nPAPER EXECUTION: DISABLED".format(settings.paper_equity_usd, settings.risk_budget_usd, settings.daily_loss_limit_usd)
    await reply(update, text)


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    controls = get_controls()
    await reply(update, f"PAUSED: {controls['paused']}\nKILL SWITCH: {controls['killed']}\nDATA PROVIDER: {settings.market_data_provider}\nPAPER EXECUTION: {settings.paper_execution_enabled}")


async def jobs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    rows = recent_jobs(10)
    if not rows:
        await reply(update, "No scheduled job history yet.")
        return
    await reply(update, "\n".join(f"{r['started_at']} | {r['job_name']} | {r['status']}" for r in rows))


async def unavailable(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "This view is not active yet. Verified market feeds, the persistent paper ledger and paper venue adapters are not configured.")


async def pause(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    set_paused(True)
    await reply(update, "PAUSED. Scheduled stages will be skipped. The pause is saved across worker restarts.")


async def resume(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    controls = get_controls()
    if controls["killed"]:
        await reply(update, "KILL SWITCH IS ACTIVE. /resume cannot override it. Manual operator review and a controlled reset are required.")
        return
    set_paused(False)
    await reply(update, "Pause cleared. Research can resume, but paper execution and data providers remain disabled until independently configured.")


async def kill(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    activate_kill()
    await reply(update, "KILL SWITCH ACTIVE and persisted. Scheduled stages will be skipped. Manual operator review is required before reset.")


async def on_startup(application: Application) -> None:
    initialize()
    start_scheduler(application)
    log.info("Research desk scheduler started in %s", settings.timezone)


async def on_shutdown(application: Application) -> None:
    stop_scheduler()


def build_application() -> Application:
    if not settings.telegram_bot_token or not settings.telegram_allowed_user_id:
        raise RuntimeError("Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USER_ID before starting the bot")
    app = Application.builder().token(settings.telegram_bot_token).post_init(on_startup).post_shutdown(on_shutdown).build()
    handlers = {
        "start": start, "brief": brief, "agents": agents, "risk": risk,
        "status": status, "jobs": jobs, "signals": unavailable, "portfolio": unavailable,
        "performance": unavailable, "strategies": unavailable, "pause": pause,
        "resume": resume, "kill": kill,
    }
    for command, handler in handlers.items():
        app.add_handler(CommandHandler(command, handler))
    return app


def main() -> None:
    build_application().run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
