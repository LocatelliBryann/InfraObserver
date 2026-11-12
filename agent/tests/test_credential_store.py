import pytest

from src.config.credential_store import save_agent_token
from dotenv import dotenv_values


def test_replaces_only_the_token_line_and_keeps_the_rest(tmp_path):
    config = tmp_path / "agent.env"
    config.write_text(
        "# Configuração do InfraObserver Agent\r\n"
        'INFRAOBSERVER_SERVER_URL="https://infraobserver.com.br"\r\n'
        'INFRAOBSERVER_AGENT_TOKEN="ioe_instalacao"\r\n'
        'INFRAOBSERVER_MONITORED_DIRECTORIES="C:\\Área de Trabalho"\r\n',
        encoding="utf-8-sig",
    )

    save_agent_token(config, "ioa_credencial")

    raw = config.read_bytes()
    assert raw.startswith(b"\xef\xbb\xbf")
    text = config.read_text(encoding="utf-8-sig")
    assert "# Configuração do InfraObserver Agent" in text
    assert "ioe_instalacao" not in text

    values = dotenv_values(config, encoding="utf-8-sig", interpolate=False)
    assert values == {
        "INFRAOBSERVER_SERVER_URL": "https://infraobserver.com.br",
        "INFRAOBSERVER_AGENT_TOKEN": "ioa_credencial",
        "INFRAOBSERVER_MONITORED_DIRECTORIES": "C:\\Área de Trabalho",
    }
    assert not (tmp_path / "agent.env.tmp").exists()


def test_appends_the_token_when_missing(tmp_path):
    config = tmp_path / "agent.env"
    config.write_text('INFRAOBSERVER_SERVER_URL="http://localhost:3000"\n', encoding="utf-8")

    save_agent_token(config, "ioa_credencial")

    values = dotenv_values(config, encoding="utf-8-sig")
    assert values["INFRAOBSERVER_AGENT_TOKEN"] == "ioa_credencial"
    assert values["INFRAOBSERVER_SERVER_URL"] == "http://localhost:3000"


def test_recognizes_spaces_and_export_before_the_key(tmp_path):
    config = tmp_path / "agent.env"
    config.write_text(
        "  export INFRAOBSERVER_AGENT_TOKEN = ioe_antigo\n"
        "INFRAOBSERVER_AGENT_TOKEN_EXTRA=fica\n",
        encoding="utf-8",
    )

    save_agent_token(config, "ioa_credencial")

    text = config.read_text(encoding="utf-8-sig")
    assert "ioe_antigo" not in text
    assert "INFRAOBSERVER_AGENT_TOKEN_EXTRA=fica" in text
    assert text.count("INFRAOBSERVER_AGENT_TOKEN=") == 1


def test_creates_the_file_when_it_does_not_exist(tmp_path):
    config = tmp_path / "InfraObserver" / "agent.env"

    save_agent_token(config, "ioa_credencial")

    assert dotenv_values(config, encoding="utf-8-sig") == {
        "INFRAOBSERVER_AGENT_TOKEN": "ioa_credencial",
    }


@pytest.mark.parametrize("token", ['ioa_"x', "ioa_\nINJECT=1"])
def test_refuses_unsafe_tokens(tmp_path, token):
    with pytest.raises(ValueError):
        save_agent_token(tmp_path / "agent.env", token)
