# Run the research desk tests on Windows 11

These checks do not require a Telegram token, broker login, wallet, market-data key or paid service.

1. Install Python 3.12 from python.org and enable "Add Python to PATH" during setup.
2. Open PowerShell in the repository folder.
3. Run:

```powershell
cd research-desk
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
pytest -q
```

If PowerShell blocks virtual-environment activation, use this one-time command in that PowerShell window:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the environment and rerun pytest.

Expected outcome: all tests pass. If any test fails, copy the complete error output (not any secret values) into the development chat.

The test suite uses local synthetic fixtures only. A passing test suite does not validate a strategy against real market data and does not authorize paper or live trading.
