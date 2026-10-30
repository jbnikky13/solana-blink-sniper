# Cloud deployment checklist

Do not deploy or enable schedules until this pull request is reviewed and credentials are supplied through the hosting provider's secret manager.

- Choose a persistent Python 3.12 worker host. The Vite dashboard alone cannot run overnight jobs.
- Configure Telegram token and numeric allowed-user ID as secrets.
- Add database-backed pause/kill state and job checkpoints; current Telegram flags are process memory only.
- Select data vendors per asset class and confirm timestamps, licensing, rate limits, historical depth, corporate actions and survivorship handling.
- Verify a paper-only venue per market. Do not configure live broker credentials.
- Add independent server-side quote acquisition and fill simulation. Do not accept browser-submitted fills.
- Add persistent audit logs and idempotency keys.
- Test stale data, missing bars, splits/dividends, FX session boundaries, NGX calendar, slippage, fees, partial fills and market halts.
- Verify schedule execution and recovery after worker restart.
- Run a full dry-run and security review before enabling the nightly schedule.

## Target schedule (WAT)

01:00 Scout collection; 02:45 handoff; 03:00 Quant; 04:45 handoff; 05:00 Builder; 06:45 independent review; 07:30 morning brief. Sunday: weekly review.

These are target times only. Scheduling is not enabled in this scaffold.

No paid provider, hosting plan, broker account, subscription or live account connection is authorized. Never ask the operator to paste API secrets into chat or commit them to Git.
