import logging
from pathlib import Path
from unittest.mock import patch

from src.config.config_file import (
    agent_id_file_for,
    load_configuration,
    parse_config_file,
    resolve_config_path,
)


def test_explicit_config_path_has_priority():
    environ = {"INFRAOBSERVER_CONFIG": "/etc/infraobserver/agent.env"}

    path = resolve_config_path(environ, frozen=True, system="Windows")

    assert path == Path("/etc/infraobserver/agent.env")


def test_installed_windows_agent_uses_program_data():
    environ = {"ProgramData": "D:/ProgramData"}

    path = resolve_config_path(environ, frozen=True, system="Windows")

    assert path == Path("D:/ProgramData") / "InfraObserver" / "agent.env"


def test_installed_windows_agent_falls_back_to_default_program_data():
    path = resolve_config_path({}, frozen=True, system="Windows")

    assert path == Path(r"C:\ProgramData") / "InfraObserver" / "agent.env"


def test_source_code_run_uses_local_env_file():
    assert resolve_config_path({}, frozen=False, system="Windows") is None
    assert resolve_config_path({}, frozen=True, system="Linux") is None


def test_load_configuration_reads_file_without_overriding_environment(tmp_path):
    config = tmp_path / "agent.env"
    config.write_text(
        'INFRAOBSERVER_SERVER_URL="https://infraobserver.example"\n'
        'INFRAOBSERVER_AGENT_TOKEN="from-file"\n',
        encoding="utf-8",
    )
    environ = {
        "INFRAOBSERVER_CONFIG": str(config),
        "INFRAOBSERVER_AGENT_TOKEN": "from-environment",
    }

    with patch.dict("os.environ", environ, clear=True):
        import os

        path = load_configuration(os.environ, frozen=False, system="Linux")

        assert path == config
        assert os.environ["INFRAOBSERVER_SERVER_URL"] == "https://infraobserver.example"
        assert os.environ["INFRAOBSERVER_AGENT_TOKEN"] == "from-environment"


def test_load_configuration_accepts_installer_file_with_bom(tmp_path):
    config = tmp_path / "agent.env"
    config.write_text(
        'INFRAOBSERVER_SERVER_URL="https://infraobserver.example"\n'
        'INFRAOBSERVER_AGENT_TOKEN="abc$def"\n',
        encoding="utf-8-sig",
    )
    environ = {"INFRAOBSERVER_CONFIG": str(config)}

    with patch.dict("os.environ", environ, clear=True):
        import os

        load_configuration(os.environ, frozen=False, system="Linux")

        assert os.environ["INFRAOBSERVER_SERVER_URL"] == "https://infraobserver.example"
        assert os.environ["INFRAOBSERVER_AGENT_TOKEN"] == "abc$def"


def test_load_configuration_warns_when_file_is_missing(tmp_path, caplog):
    missing = tmp_path / "agent.env"
    environ = {"INFRAOBSERVER_CONFIG": str(missing)}

    with caplog.at_level(logging.WARNING):
        path = load_configuration(environ, frozen=False, system="Linux")

    assert path == missing
    assert "Configuration file not found" in caplog.text


def test_load_configuration_uses_local_env_file_from_source():
    with patch("src.config.config_file.load_dotenv") as mock_load_dotenv:
        path = load_configuration({}, frozen=False, system="Linux")

    assert path is None
    mock_load_dotenv.assert_called_once_with()


def test_load_configuration_detects_platform_by_default():
    with (
        patch("src.config.config_file.platform.system", return_value="Linux"),
        patch("src.config.config_file.load_dotenv") as mock_load_dotenv,
    ):
        assert load_configuration({}) is None

    mock_load_dotenv.assert_called_once_with()


def test_agent_id_file_sits_next_to_config(tmp_path):
    assert agent_id_file_for(tmp_path / "agent.env") == tmp_path / "agent-id"
    assert agent_id_file_for(None) == Path("agent-id")


def test_windows_paths_keep_their_backslashes(tmp_path):
    # Antes, "\a" e "\n" entre aspas viravam caracteres especiais.
    config = tmp_path / "agent.env"
    config.write_text(
        'INFRAOBSERVER_MONITORED_DIRECTORIES="D:\\a\\_temp\\pasta,C:\\Users\\nome\\Área de Trabalho,\\\\servidor\\financeiro"\r\n',
        encoding="utf-8-sig",
    )
    environ = {"INFRAOBSERVER_CONFIG": str(config)}

    load_configuration(environ, frozen=False, system="Linux")

    assert environ["INFRAOBSERVER_MONITORED_DIRECTORIES"] == (
        "D:\\a\\_temp\\pasta,C:\\Users\\nome\\Área de Trabalho,\\\\servidor\\financeiro"
    )


def test_parse_config_file_formats():
    text = (
        "# comentário\n"
        "\n"
        "export INFRAOBSERVER_A = 'simples'\n"
        "INFRAOBSERVER_B=sem-aspas # comentário\n"
        'INFRAOBSERVER_C=""\n'
        "linha sem igual\n"
        "=sem chave\n"
        'INFRAOBSERVER_D="tem # dentro"\n'
    )

    assert parse_config_file(text) == {
        "INFRAOBSERVER_A": "simples",
        "INFRAOBSERVER_B": "sem-aspas",
        "INFRAOBSERVER_C": "",
        "INFRAOBSERVER_D": "tem # dentro",
    }
