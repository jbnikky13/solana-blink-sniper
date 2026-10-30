# Solana scanner security model

## Current scope

This repository is a discovery and monitoring dashboard. The work in this branch adds a conservative scanner eligibility gate; it does not add transaction signing, swap execution, wallet custody, or autonomous real-money trading.

## Scanner gate

The initial scanner policy uses:

- Minimum observed DEX liquidity: **$40,000**.
- Mint authority: must be explicitly confirmed revoked.
- Freeze authority: must be explicitly confirmed revoked.
- Honeypot check: must explicitly report false.
- Top-10 holder concentration: must be explicitly verified at or below **25%**.

A breached hard limit is REJECT. Missing or incomplete evidence is REVIEW. Only explicit passing evidence can produce PASS.

## Holder concentration limitation

The Solana RPC method `getTokenLargestAccounts` returns at most 20 token accounts. The current implementation groups those accounts by token-account owner and calculates an estimate against mint supply. This is **not a complete wallet-level holder census**: a wallet can own additional token accounts outside the returned top 20, and pool/custody accounts can affect interpretation.

For that reason the RPC-derived value is marked `estimated`, never `verified`. The scanner will not pass a token to a future trading executor based on this estimate alone. A separate complete holder-data source and validation are required before that gate can be promoted.

## Analyst score

The existing discovery score remains a heuristic ranking score, not a calibrated probability of profit or a validated trading model. It is labeled `heuristic-discovery-v1`. A score of 70 is only a research threshold; it is not authorization to buy.

## Safety status

- Real-money execution: not implemented.
- Private-key handling: not implemented.
- Paper-trading ledger: not implemented.
- Stop-loss / trailing-exit engine: not implemented.
- Four-agent orchestration: not implemented yet.
- CI: runs unit tests and the Vite production build.

Never place a seed phrase or private key in frontend environment variables, browser storage, source code, or Git history.
