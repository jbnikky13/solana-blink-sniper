# Windows MT5 read-only probe

This is a diagnostic for the user's Headway Demo terminal. It is not an execution bot and contains no order-submission calls.

## Windows 11 setup

1. Install MetaTrader 5 from Headway's official website or client area.
2. In MT5, log in manually to the Headway-Demo account/server. The official demo server is documented as mt5.demo.trade-hw.online.
3. Do not log into a real account on the machine used for this probe.
4. Install Python 3.12.
5. Open PowerShell in this folder and run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:MT5_SYMBOLS = "EURUSD,XAUUSD"
python probe.py
```

Replace the sample symbols with exact names visible in your Headway MT5 Market Watch; some brokers use suffixes.

## Safety

- The script calls initialize, account_info, terminal_info, symbols_get, symbol_info and symbol_info_tick only.
- It refuses to proceed unless the server name contains "demo".
- It does not call order_send, create orders, change positions, or access a wallet.
- Do not send account passwords, trading passwords, API secrets or private keys in chat or GitHub.
- The probe output contains quotes and account metadata. Review it before sharing; redact any account identifiers if your terminal exposes them.

## Cloud limitation

MetaQuotes' Python package communicates with a local MT5 terminal. To run this bridge unattended while the personal PC is off, the terminal needs to run on a Windows VPS. That is a separate paid-infrastructure decision and is not included in this implementation.
