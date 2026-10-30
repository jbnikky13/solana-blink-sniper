# Overnight Quant Research Desk

A separate Python 3.12 service for the Blink-N-Snipe project. Telegram is the operator interface; a cloud worker will run scheduled research independently of the browser dashboard.

## Operating policy

- Paper-only. No live broker order route, wallet signer, private-key support, or deposit flow.
- Starting simulated equity: USD 1,000.
- Risk budget: at most 1% of current paper equity per position (initially USD 10).
- Daily realized-loss stop: 3% of start-of-day equity (initially USD 30).
- Intraday and swing strategies are eligible.
- Options are prohibited.
- Research may cover crypto, US equities/ETFs, FX, commodities, and NGX equities, but a market is eligible for paper trading only when a provider supplies timestamped, sufficiently complete data and an approved paper venue exists.
- Missing, stale, non-executable, or unlicensed data means NO TRADE. Never synthesize prices or fills.

## Agents

1. SCOUT: timestamped macro, news, earnings, filings, volume and sentiment evidence.
2. QUANT: hypotheses, chronological/out-of-sample and walk-forward tests, fees/slippage and multiple-testing controls.
3. BUILDER: independently reviewed strategies packaged for paper-only execution. Builder cannot bypass risk checks.

Agenkit's verified project and package are at https://agenkit.dev and https://pypi.org/project/agenkit/. The previously supplied agenkit.xyz address could not be verified; do not install packages or provide credentials to lookalike domains.

## Current status

This is an isolated service scaffold. Provider adapters, persistent job state, validated market-data storage, Telegram credentials, and cloud worker deployment still need to be configured and tested. Until then, jobs must report DATA_NOT_CONFIGURED and must not generate signals or trades.

## Acceptance

Score candidates 1–5 on out-of-sample Sharpe, maximum drawdown, trade count, edge after costs, and walk-forward stability. A score of 18/25 is only an initial screen, not proof of an edge. Require at least 30 out-of-sample trades as a screening floor and disclose uncertainty.

Each strategy report must include thesis, why counterparties lose, exact entry/exit/stops/sizing, in-sample vs out-of-sample results after costs, 1,000-run Monte Carlo drawdown distribution, regime-break risk, cheapest falsification test, and WHY THIS COULD FAIL.
