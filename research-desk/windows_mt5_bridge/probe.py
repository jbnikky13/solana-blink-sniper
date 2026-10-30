"""Read-only MetaTrader 5 connectivity probe.

This script never sends orders. It refuses to continue unless the connected
terminal reports a demo server. Log in to Headway-Demo manually in MT5 first.
"""
import json
import os
import sys
from datetime import datetime, timezone

try:
    import MetaTrader5 as mt5
except ImportError:
    raise SystemExit("Install the Windows bridge requirements first: pip install -r requirements.txt")


def main() -> int:
    symbols = [item.strip() for item in os.getenv("MT5_SYMBOLS", "").split(",") if item.strip()]
    if not mt5.initialize():
        print(json.dumps({"status": "CONNECT_FAILED", "error": str(mt5.last_error())}, indent=2))
        return 2

    try:
        account = mt5.account_info()
        terminal = mt5.terminal_info()
        if account is None or terminal is None:
            print(json.dumps({"status": "ACCOUNT_OR_TERMINAL_INFO_UNAVAILABLE"}, indent=2))
            return 3

        server = str(account.server or "")
        if "demo" not in server.lower():
            print(json.dumps({
                "status": "REFUSED_NON_DEMO_SERVER",
                "server": server,
                "message": "This read-only probe is restricted to demo accounts.",
            }, indent=2))
            return 4

        available = mt5.symbols_get()
        result = {
            "status": "DEMO_CONNECTED",
            "server": server,
            "account_currency": account.currency,
            "terminal_connected": bool(terminal.connected),
            "available_symbol_count": len(available or ()),
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "quotes": [],
            "note": "Read-only probe. No order submission functions are called.",
        }

        for symbol in symbols:
            info = mt5.symbol_info(symbol)
            tick = mt5.symbol_info_tick(symbol)
            if info is None or tick is None:
                result["quotes"].append({"symbol": symbol, "status": "SYMBOL_OR_TICK_UNAVAILABLE"})
                continue
            result["quotes"].append({
                "symbol": symbol,
                "status": "OK",
                "bid": tick.bid,
                "ask": tick.ask,
                "last": tick.last,
                "tick_time_utc": datetime.fromtimestamp(tick.time, timezone.utc).isoformat(),
                "digits": info.digits,
                "trade_mode": info.trade_mode,
                "spread_points": info.spread,
            })

        print(json.dumps(result, indent=2))
        return 0
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    sys.exit(main())
