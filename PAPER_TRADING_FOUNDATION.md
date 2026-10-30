# Paper-trading foundation

## Scope
This branch adds a deterministic, testable paper-trading core. It does not connect a wallet, sign transactions, submit swaps, run continuously, or persist records yet.

## Decision roles
- **Scanner:** requires Solana, at least $40,000 reported liquidity, verified mint/freeze authority revocation, explicitly false honeypot result, verified top-holder concentration <=25%, and existing scanner gate PASS.
- **Analyst:** deterministic research rules require score >=70, reference price, positive 1h volume, and more 5m buys than sells. This is not an LLM, independent research service, or calibrated win probability.
- **Risk manager:** 1% equity risk per trade, 3% daily realized-loss halt, maximum three concurrent positions.
- **Executor:** simulated fills only; buys at ask plus slippage and sells at bid less slippage. Requires idempotency key and risk approval.

## Exits
- Initial stop: 6% below simulated entry.
- Trailing stop: 12% below high-water mark, activated after price advances 7% above entry. Effective stop is the tighter stop.
- Position size derives from risk budget and stop distance, capped at 20% of paper equity.
- Fees and slippage are included in simulated P&L.

These defaults are research hypotheses, not evidence of profitability.

## Persistence
The Supabase migration creates a private trade ledger and event table. Authenticated users can read only their own records. There are no direct client write policies. A trusted server-side writer, authenticated user identity, migration application, and append-only event enforcement are still required.

## Safety
- PAPER_ONLY is hard-coded in decision output.
- No private key, wallet integration, or real order execution exists in this module.
- Current browser scanning is not a 24/7 worker.
- Never expose a Supabase service-role key through a VITE_ variable or browser bundle.
- Do not enable live trading based on unit tests or a small number of paper trades.
