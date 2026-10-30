from agenkit import Agent, Message


class DeskAgent(Agent):
    def __init__(self, role: str, responsibility: str):
        self._role = role
        self._responsibility = responsibility

    @property
    def name(self) -> str:
        return self._role.lower()

    async def process(self, message: Message) -> Message:
        # Data providers are not connected yet. Never invent evidence or prices.
        return Message(role="agent", content={"agent": self._role, "status": "DATA_NOT_CONFIGURED", "responsibility": self._responsibility, "input_received": bool(message.content), "signals": [], "trades": []})


SCOUT = DeskAgent("SCOUT", "Timestamped macro, news, earnings, filings, volume and sentiment collection")
QUANT = DeskAgent("QUANT", "Hypothesis generation, cost-aware backtesting and out-of-sample validation")
BUILDER = DeskAgent("BUILDER", "Reviewed paper-only strategy packaging with hard risk gates")
