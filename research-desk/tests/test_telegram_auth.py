from types import SimpleNamespace
from research_desk import main
from research_desk.config import settings


def test_only_configured_owner_in_private_chat_is_authorized(monkeypatch):
    monkeypatch.setattr(settings, "telegram_allowed_user_id", 12345)
    private_update = SimpleNamespace(
        effective_user=SimpleNamespace(id=12345),
        effective_chat=SimpleNamespace(type="private", id=12345),
    )
    group_update = SimpleNamespace(
        effective_user=SimpleNamespace(id=12345),
        effective_chat=SimpleNamespace(type="group", id=-100),
    )
    other_user_update = SimpleNamespace(
        effective_user=SimpleNamespace(id=999),
        effective_chat=SimpleNamespace(type="private", id=999),
    )
    assert main.authorized(private_update)
    assert not main.authorized(group_update)
    assert not main.authorized(other_user_update)
