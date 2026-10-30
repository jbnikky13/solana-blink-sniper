from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    telegram_bot_token: str = ""
    telegram_allowed_user_id: int = 0
    timezone: str = "Africa/Lagos"
    paper_equity_usd: float = 1000.0
    risk_per_trade_pct: float = 0.01
    daily_loss_limit_pct: float = 0.03
    max_open_positions: int = 3
    options_enabled: bool = False
    paper_execution_enabled: bool = False
    market_data_provider: str = "none"

    @property
    def risk_budget_usd(self) -> float:
        return round(self.paper_equity_usd * self.risk_per_trade_pct, 2)

    @property
    def daily_loss_limit_usd(self) -> float:
        return round(self.paper_equity_usd * self.daily_loss_limit_pct, 2)


settings = Settings()
