from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from telegram.ext import Application
from .config import settings
from .pipeline import scout, quant, builder, independent_review, morning_brief, weekly_review
from .state import initialize

scheduler = AsyncIOScheduler(timezone=settings.timezone)


async def notify(application: Application, fn) -> None:
    result = fn()
    if settings.telegram_allowed_user_id:
        await application.bot.send_message(chat_id=settings.telegram_allowed_user_id, text=result)


def start_scheduler(application: Application) -> None:
    initialize()
    if scheduler.running:
        return
    jobs = [
        ("scout", scout, "0 1 * * *"),
        ("quant", quant, "0 3 * * *"),
        ("builder", builder, "0 5 * * *"),
        ("independent-review", independent_review, "45 6 * * *"),
        ("morning-brief", morning_brief, "30 7 * * *"),
        ("weekly-review", weekly_review, "0 8 * * sun"),
    ]
    for job_id, fn, expression in jobs:
        minute, hour, day, month, weekday = expression.split()
        scheduler.add_job(
            notify, CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=weekday, timezone=settings.timezone),
            id=job_id, args=[application, fn], replace_existing=True, coalesce=True, max_instances=1,
            misfire_grace_time=900,
        )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
