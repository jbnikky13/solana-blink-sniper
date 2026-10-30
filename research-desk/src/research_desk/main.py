import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from .config import settings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("research-desk")
PAUSED = False
KILLED = False


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
    await reply(update, "Blink-N-Snipe Research Desk\nPaper-only mode. Commands: /brief /agents /risk /signals /portfolio /performance /strategies /pause /resume /kill")


async def brief(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "Morning brief: DATA_NOT_CONFIGURED. No market feed is connected; no prices, signals or returns are being reported.")


async def agents(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "SCOUT: DATA_NOT_CONFIGURED\nQUANT: BLOCKED pending timestamped historical data\nBUILDER: BLOCKED pending independent review and a paper venue")


async def risk(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = "PAPER EQUITY: {0:.2f} USD\nRISK / TRADE: {1:.2f} USD (1%)\nDAILY LOSS STOP: {2:.2f} USD (3%)\nOPTIONS: PROHIBITED\nPAPER EXECUTION: DISABLED".format(settings.paper_equity_usd, settings.risk_budget_usd, settings.daily_loss_limit_usd)
    await reply(update, text)


async def unavailable(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply(update, "No verified market data or persisted paper ledger is connected yet. This command is not active.")


async def pause(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    global PAUSED
    PAUSED = True
    await reply(update, "Pause flag set for this process. Persistent pause state is not yet configured.")


async def resume(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    global PAUSED
    if KILLED:
        await reply(update, "Kill switch is active. Manual operator review is required; /resume cannot override /kill.")
        return
    PAUSED = False
    await reply(update, "Pause flag cleared. Data collection and paper execution remain disabled until validated.")


async def kill(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    global PAUSED, KILLED
    PAUSED = True
    KILLED = True
    await reply(update, "KILL SWITCH ACTIVE. Manual operator review is required before restart.")


def build_application() -> Application:
    if not settings.telegram_bot_token or not settings.telegram_allowed_user_id:
        raise RuntimeError("Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USER_ID before starting the bot")
    app = Application.builder().token(settings.telegram_bot_token).build()
    handlers = {
        "start": start, "brief": brief, "agents": agents, "risk": risk,
        "signals": unavailable, "portfolio": unavailable, "performance": unavailable,
        "strategies": unavailable, "pause": pause, "resume": resume, "kill": kill,
    }
    for command, handler in handlers.items():
        app.add_handler(CommandHandler(command, handler))
    return app


def main() -> None:
    build_application().run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
