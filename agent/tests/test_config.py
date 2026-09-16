import os
from uuid import UUID

from src.config.settings import AgentSettings


def test_settings_load_required_values_from_environment(monkeypatch):
    monkeypatch.setenv("INFRAOBSERVER_SERVER_URL", "http://localhost:3000")
    monkeypatch.setenv("INFRAOBSERVER_AGENT_TOKEN", "test-token")
    monkeypatch.setenv("INFRAOBSERVER_AGENT_ID", "550e8400-e29b-41d4-a716-446655440000")

    settings = AgentSettings.from_environment()

    assert settings.server_url == "http://localhost:3000"
    assert settings.agent_token == "test-token"
    assert settings.agent_id == UUID("550e8400-e29b-41d4-a716-446655440000")
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
    monkeypatch.setenv("INFRAOBSERVER_SERVER_URL", "http://localhost:3000")
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
    monkeypatch.setenv("INFRAOBSERVER_SERVER_URL", "http://localhost:3000")
    monkeypatch.setenv("INFRAOBSERVER_AGENT_TOKEN", "test-token")
    monkeypatch.delenv("INFRAOBSERVER_AGENT_ID", raising=False)

    try:
        AgentSettings.from_environment()
        assert False, "Expected ValueError"
    except ValueError as error:
        assert str(error) == "INFRAOBSERVER_AGENT_ID is not configured"