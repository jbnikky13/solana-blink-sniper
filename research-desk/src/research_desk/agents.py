import json
from agenkit import Agent, Message


class DeskAgent(Agent):
    """Agenkit agent identity for one research responsibility.

    Until its data and evaluation tools are implemented, the agent returns an
    explicit blocked status rather than pretending to have completed research.
    """

    def __init__(self, role: str, responsibility: str):
        self._role = role
        self._responsibility = responsibility

    @property
    def name(self) -> str:
        return self._role.lower()

    @property
    def capabilities(self) -> list[str]:
        return ["research-orchestration", "fail-closed"]

    async def process(self, message: Message) -> Message:
        result = {
            "agent": self._role,
            "status": "DATA_NOT_CONFIGURED",
            "responsibility": self._responsibility,
            "request_received": bool(message.content),
            "signals": [],
            "trades": [],
            "reason": "Verified data and validated tools are not connected.",
        }
        return Message(role="agent", content=json.dumps(result), metadata={"agent": self.name})


SCOUT = DeskAgent("SCOUT", "Timestamped macro, news, earnings, filings, volume and sentiment collection")
QUANT = DeskAgent("QUANT", "Hypothesis generation, cost-aware backtesting and out-of-sample validation")
BUILDER = DeskAgent("BUILDER", "Reviewed paper-only strategy packaging with hard risk gates")
