
import os

from uuid import UUID

from src.config.settings import AgentSettings


def set_required_environment(monkeypatch):
    monkeypatch.setenv(
        "INFRAOBSERVER_SERVER_URL",
        "http://localhost:3000",
    )
    monkeypatch.setenv(
        "INFRAOBSERVER_AGENT_TOKEN",
        "test-token",
    )
    monkeypatch.setenv(
        "INFRAOBSERVER_AGENT_ID",
        "550e8400-e29b-41d4-a716-446655440000",
    )


def test_settings_load_required_values_from_environment(monkeypatch):
    set_required_environment(monkeypatch)

    settings = AgentSettings.from_environment()

    assert settings.server_url == "http://localhost:3000"
    assert settings.agent_token == "test-token"
    assert settings.agent_id == UUID(
        "550e8400-e29b-41d4-a716-446655440000"
    )
    assert settings.collection_interval == 60


def test_settings_raise_error_when_server_url_is_missing(monkeypatch):
    monkeypatch.delenv("INFRAOBSERVER_SERVER_URL", raising=False)
    monkeypatch.setenv("INFRAOBSERVER_AGENT_TOKEN", "test-token")
    monkeypatch.setenv(
        "INFRAOBSERVER_AGENT_ID",
        "550e8400-e29b-41d4-a716-446655440000",
    )

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == "INFRAOBSERVER_SERVER_URL is not configured"


def test_settings_raise_error_when_agent_token_is_missing(monkeypatch):
    monkeypatch.setenv(
        "INFRAOBSERVER_SERVER_URL",
        "http://localhost:3000",
    )
    monkeypatch.delenv("INFRAOBSERVER_AGENT_TOKEN", raising=False)
    monkeypatch.setenv(
        "INFRAOBSERVER_AGENT_ID",
        "550e8400-e29b-41d4-a716-446655440000",
    )

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == "INFRAOBSERVER_AGENT_TOKEN is not configured"


def test_settings_raise_error_when_agent_id_is_missing(monkeypatch):
    monkeypatch.setenv(
        "INFRAOBSERVER_SERVER_URL",
        "http://localhost:3000",
    )
    monkeypatch.setenv("INFRAOBSERVER_AGENT_TOKEN", "test-token")
    monkeypatch.delenv("INFRAOBSERVER_AGENT_ID", raising=False)

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == "INFRAOBSERVER_AGENT_ID is not configured"


def test_loads_monitored_directories_from_environment(monkeypatch):
    set_required_environment(monkeypatch)

    monkeypatch.setenv(
        "INFRAOBSERVER_MONITORED_DIRECTORIES",
        "C:/Users/test/Documents, C:/Users/test/Desktop",
    )

    settings = AgentSettings.from_environment()

    assert settings.monitored_directories == [
        "C:/Users/test/Documents",
        "C:/Users/test/Desktop",
    ]


def test_ignores_empty_monitored_directories(monkeypatch):
    set_required_environment(monkeypatch)

    monkeypatch.setenv(
        "INFRAOBSERVER_MONITORED_DIRECTORIES",
        "C:/Users/test/Documents,, C:/Users/test/Desktop, ",
    )

    settings = AgentSettings.from_environment()

    assert settings.monitored_directories == [
        "C:/Users/test/Documents",
        "C:/Users/test/Desktop",
    ]

def test_loads_collection_interval_from_environment(monkeypatch):
    set_required_environment(monkeypatch)
    monkeypatch.setenv("INFRAOBSERVER_COLLECTION_INTERVAL", "30")

    settings = AgentSettings.from_environment()

    assert settings.collection_interval == 30


def test_uses_default_collection_interval_when_empty(monkeypatch):
    set_required_environment(monkeypatch)
    monkeypatch.setenv("INFRAOBSERVER_COLLECTION_INTERVAL", "  ")

    settings = AgentSettings.from_environment()

    assert settings.collection_interval == 60


def test_rejects_non_numeric_collection_interval(monkeypatch):
    set_required_environment(monkeypatch)
    monkeypatch.setenv("INFRAOBSERVER_COLLECTION_INTERVAL", "abc")

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == (
            "INFRAOBSERVER_COLLECTION_INTERVAL must be a positive integer"
        )


def test_rejects_non_positive_collection_interval(monkeypatch):
    set_required_environment(monkeypatch)
    monkeypatch.setenv("INFRAOBSERVER_COLLECTION_INTERVAL", "0")

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == (
            "INFRAOBSERVER_COLLECTION_INTERVAL must be a positive integer"
        )


def test_loads_ignored_patterns_from_environment(monkeypatch):
    monkeypatch.setenv("INFRAOBSERVER_SERVER_URL", "http://localhost:3000")
    monkeypatch.setenv("INFRAOBSERVER_AGENT_TOKEN", "token")
    monkeypatch.setenv(
        "INFRAOBSERVER_AGENT_ID",
        "550e8400-e29b-41d4-a716-446655440000",
    )
    monkeypatch.setenv("INFRAOBSERVER_IGNORED_PATTERNS", "*.bak, *.log ,")

    settings = AgentSettings.from_environment()

    assert settings.ignored_patterns == ["*.bak", "*.log"]


def test_update_interval_defaults_to_six_hours(monkeypatch):
    set_required_environment(monkeypatch)
    monkeypatch.delenv("INFRAOBSERVER_UPDATE_INTERVAL_HOURS", raising=False)

    assert AgentSettings.from_environment().update_interval_hours == 6


def test_update_interval_can_be_configured_or_disabled(monkeypatch):
    set_required_environment(monkeypatch)

    monkeypatch.setenv("INFRAOBSERVER_UPDATE_INTERVAL_HOURS", "0.5")
    assert AgentSettings.from_environment().update_interval_hours == 0.5

    monkeypatch.setenv("INFRAOBSERVER_UPDATE_INTERVAL_HOURS", "0")
    assert AgentSettings.from_environment().update_interval_hours == 0


def test_rejects_invalid_update_interval(monkeypatch):
    import pytest

    set_required_environment(monkeypatch)

    for value in ("sempre", "-1"):
        monkeypatch.setenv("INFRAOBSERVER_UPDATE_INTERVAL_HOURS", value)

        with pytest.raises(ValueError, match="UPDATE_INTERVAL_HOURS"):
            AgentSettings.from_environment()
