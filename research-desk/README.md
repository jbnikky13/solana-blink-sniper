# Overnight Quant Research Desk

A separate Python 3.12 service for Blink-N-Snipe. Telegram is the operator interface; a cloud worker runs the WAT schedule independently of the browser dashboard.

## Operating policy

- Paper-only. No live broker order route, wallet signer, private-key support, or deposit flow.
- Starting simulated equity: USD 1,000.
- Risk budget: at most 1% of current paper equity per position (initially USD 10).
- Daily loss stop: 3% of start-of-day equity (initially USD 30), counting daily P&L.
- Intraday and swing strategies are eligible.
- Options are prohibited.
- Research coverage: crypto, US equities/ETFs, FX, commodities and NGX equities.
- A market is eligible for paper trading only when its provider supplies timestamped, sufficiently complete data and an approved paper venue exists.
- Missing, stale, non-executable or unlicensed data means NO TRADE. Never synthesize prices or fills.

## Agents

1. SCOUT: timestamped macro, news, earnings, filings, volume and sentiment evidence.
2. QUANT: hypotheses, chronological/out-of-sample and walk-forward tests, fees/slippage and multiple-testing controls.
3. BUILDER: independently reviewed strategies packaged for paper-only execution. Builder cannot bypass risk checks.

Agenkit package: https://pypi.org/project/agenkit/ . Project docs: https://agenkit.dev/ .

## Current implementation

- Agenkit-compatible agent roles and fail-closed agent responses.
- Telegram bot with private-user authorization, status/risk/jobs/brief commands, pause, resume and kill.
- Africa/Lagos scheduler for Scout, Quant, Builder, review, morning brief and Sunday weekly review.
- SQLite-persisted operator controls and job audit history.
- Initial fail-closed risk gate and unit tests.\n- Normalized OHLCV schema with timestamp, freshness, ordering and OHLC validation.\n- Next-bar-open baseline backtester with fee/slippage assumptions and mark-to-market drawdown.\n- Ten initial hypothesis templates, chronological walk-forward window generation, 1,000-path Monte Carlo drawdown and a pre-registered 25-point scorecard.
- Dockerfile and Compose example with persistent SQLite volume.
- Market provider coverage and cloud runbooks.

**Still not operational:** market-data adapters, historical data store, research/backtesting engine, Monte Carlo evaluator, paper broker/venue adapters, real trade ledger, and independent review workflow. Scheduled agents therefore report DATA_NOT_CONFIGURED and produce no signals or trades.

## Local setup

Requires Python 3.12+ and Docker (recommended).

1. Copy .env.example to .env.
2. Create a private Telegram bot with BotFather.
3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USER_ID in .env.
4. Run:

```bash
docker compose up --build -d
docker compose logs -f research-desk
```

Then use /start, /risk, /agents, /status and /jobs in the private Telegram chat.

Do not commit .env or paste bot tokens into chat. Never put broker passwords, account numbers or private keys in Git.

## Target schedule (WAT)

01:00 Scout; 03:00 Quant; 05:00 Builder; 06:45 independent review; 07:30 morning brief; Sunday 08:00 weekly review.

## Strategy acceptance

Score candidates 1–5 on out-of-sample Sharpe, maximum drawdown, trade count, edge after costs, and walk-forward stability. A score of 18/25 is only an initial screen, not proof of an edge. Require at least 30 out-of-sample trades as a screening floor and disclose uncertainty.

Each strategy report must include thesis, why counterparties lose, exact entry/exit/stops/sizing, in-sample vs out-of-sample results after costs, 1,000-run Monte Carlo drawdown distribution, regime-break risk, cheapest falsification test, and WHY THIS COULD FAIL.
