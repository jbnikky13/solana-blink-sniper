# Market data and paper venue coverage

This desk is multi-market by design, but adapters must be qualified separately. Research coverage is not the same as permission or ability to place a simulated order.

| Market | Candidate source / venue | What is verified | Current status |
|---|---|---|---|
| US stocks and ETFs | Alpaca market data + Alpaca paper trading | Alpaca documents US stocks/ETFs, market data and a paper simulation. | Candidate only; account and credentials not connected. |
| Crypto spot | Exchange public market-data API (CCXT) | A read-only spot OHLCV adapter is implemented; it uses public endpoints, checks spot market status, drops the incomplete candle and stores validated bars. | Implemented but not configured; no exchange or symbols selected. |
| FX, metals, energies and index CFDs | User's Headway Demo through MetaTrader 5 | Headway documents MT5 demo accounts and the Headway-Demo server. MetaQuotes documents Python-to-MT5 terminal integration for quotes, bars, account state and orders. | Preferred demo gateway candidate; requires a Windows machine/VPS running MT5. No credentials requested or connected. |
| NGX equities | NGX X-DataPortal / official NGX data API | NGX documents a free seven-day historical portal tier and separately licensed real-time/API and historical data products. | Data-access and licensing review required before use. |

## Provider-specific boundaries

### Alpaca
Alpaca documents stocks, US-listed ETFs and crypto, with paper trading. Its current asset-class overview does not list FX, futures or international equities as supported trading products. Do not use it as the sole multi-market broker.

### Headway Demo / MT5
Headway's official help centre documents MT5 demo accounts and the Headway-Demo server (mt5.demo.trade-hw.online). MetaQuotes' Python integration communicates with a locally installed MT5 terminal; it is not a hosted REST endpoint. For unattended operation with the PC closed, the MT5 terminal would need to run on a Windows VPS. Keep the terminal logged into the demo server only. No real-account credentials, live server or live order path may be configured.

### NGX
NGX's official X-DataPortal advertises seven days of historical prices free; deeper historical data and real-time API access are separate products or subscriptions. Its authorized-vendor and data policies apply. NGX should remain research-only until suitable history and licensing terms are verified.

## Coverage state rules

Each instrument-market pair must carry provider, source timestamp, received timestamp, timezone, quote type, currency, session, market status, and data-quality flags. The desk must reject stale quotes, incomplete candles, symbol mismatches, unadjusted corporate actions, invalid FX conversions and unsupported execution venues.

Do not blend feeds from different venues without recording basis/spread differences. A strategy tested on one broker's CFD feed must not be described as validated on exchange-traded futures or spot.

## Rollout order

1. Build and validate read-only provider adapters.
2. Build a normalized bar/quote schema and durable historical store.
3. Validate each feed against the broker/exchange terminal and known timestamps.
4. Implement independent cost-aware paper fills.
5. Add an Alpaca paper adapter only for eligible US stocks/ETFs/crypto.
6. Add Headway MT5 demo read-only bridge on a Windows VPS after explicit setup.
7. Add NGX only after approved data access and sufficient historical coverage.

No paid account, VPS, data subscription, or broker connection is authorized by this documentation.