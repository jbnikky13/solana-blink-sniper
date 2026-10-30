# Cloud worker runbook

The Linux container runs the Telegram control bot, SQLite audit state and WAT scheduler. It does not yet connect to any broker or market-data feed.

## Local Docker dry run

1. Copy .env.example to .env.
2. Create a private Telegram bot with BotFather.
3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USER_ID in .env. Obtain the numeric Telegram user ID using a trusted method; do not post the bot token in GitHub or chat.
4. Build and start:

   docker compose up --build -d

5. Inspect logs:

   docker compose logs -f research-desk

6. In the private Telegram chat, use /start, /risk, /agents, /status and /jobs.
7. Stop with docker compose down. The named volume preserves SQLite state across container replacement.

## Before a cloud deployment

- Choose a host with a persistent disk/volume and always-on container support.
- Configure secrets in the host's secret manager, not in Git.
- Confirm restart policy, backups, timezone, alerting and recovery after a worker restart.
- Keep the SQLite volume persistent; for multi-replica deployment, migrate to managed PostgreSQL before scaling.
- Verify Telegram polling and scheduler operation in a dry run.
- Do not enable execution. PAPER_EXECUTION_ENABLED remains false.

## Headway MT5 bridge

The MT5 Python integration requires a locally running MetaTrader 5 terminal. A Linux container cannot host the Windows terminal. To use Headway Demo while the personal PC is off, a separate Windows VPS would be needed for the terminal/bridge, or the whole worker could be hosted on a suitable Windows VPS. This is a later, separate infrastructure decision; no VPS has been purchased or configured.

Official Headway documentation identifies the demo server as Headway-Demo / mt5.demo.trade-hw.online. Never place real-account credentials on this worker.

## Provider order

Read MARKET_COVERAGE.md. Do not add provider credentials until data licensing, symbol coverage, history depth, timestamps, paper venue semantics and cost models have been verified.
