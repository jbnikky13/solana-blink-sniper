# Cloud deployment checklist

The initial worker scaffold now includes a WAT scheduler, Telegram command handlers, SQLite-persisted pause/kill controls and a job audit table. It still does not collect real market data, backtest strategies or execute paper orders.

Before deployment:
- Choose an always-on host with a persistent disk/volume.
- Configure Telegram token and numeric allowed-user ID through the host's secret manager.
- Keep SQLite on a persistent volume; use managed PostgreSQL before running multiple replicas.
- Configure backups, alerting and restart recovery.
- Verify the worker's clock and Africa/Lagos timezone.
- Verify Telegram polling and all scheduled jobs in a dry run.
- Select data vendors per asset class and confirm timestamps, licensing, rate limits, historical depth, corporate actions and survivorship handling.
- Verify paper-only venue support for each market. Do not configure live broker credentials.
- Add independent server-side quote acquisition, a validated backtesting engine and cost-aware paper fills.
- Test stale data, missing bars, splits/dividends, FX session boundaries, NGX calendar, slippage, fees, partial fills and market halts.
- Run a full dry-run and security review before enabling paper execution.

## Target schedule (WAT)

01:00 Scout; 03:00 Quant; 05:00 Builder; 06:45 independent review; 07:30 morning brief. Sunday 08:00 weekly review.

The scheduler starts when the Telegram worker starts. In the current scaffold, scheduled agent stages return DATA_NOT_CONFIGURED because no market-data adapters are connected. This is intentional and safe.

No paid provider, hosting plan, broker account, subscription or live account connection is authorized. Never ask the operator to paste API secrets into chat or commit them to Git.
