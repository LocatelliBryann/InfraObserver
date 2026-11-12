import logging
from pathlib import Path
from unittest.mock import ANY, Mock, patch

from src.core.agent import Agent
from src.main import (
    create_agent,
    create_file_observers,
    resolve_monitored_directories,
)


def test_create_agent_builds_agent_with_required_dependencies():
    settings = Mock()
    settings.server_url = "http://localhost:3000"
    settings.agent_token = "test-token"
    settings.monitored_directories = []
    settings.ignored_patterns = []

    with (
        patch("src.main.default_monitored_directories", return_value=[]),
        patch(
            "src.main.AgentSettings.from_environment",
            return_value=settings,
        ),
        patch("src.main.HttpClient") as mock_http_client,
        patch("src.main.SystemInfoCollector") as mock_system_info_collector,
        patch("src.main.RegistrationService") as mock_registration_service,
        patch("src.main.CpuCollector") as mock_cpu_collector,
        patch("src.main.MemoryCollector") as mock_memory_collector,
        patch("src.main.DiskCollector") as mock_disk_collector,
        patch("src.main.NetworkCollector") as mock_network_collector,
        patch("src.main.MetricsCollector") as mock_metrics_collector,
        patch("src.main.MetricsService") as mock_metrics_service,
        patch("src.main.Outbox") as mock_outbox,
        patch("src.main.OutboxSender") as mock_outbox_sender,
    ):
        agent = create_agent()

        mock_http_client.assert_called_once_with(
            server_url="http://localhost:3000",
            agent_token="test-token",
        )

        mock_system_info_collector.assert_called_once_with()

        mock_registration_service.assert_called_once_with(
            http_client=mock_http_client.return_value,
            settings=settings,
            system_info_collector=mock_system_info_collector.return_value,
            save_token=None,
        )

        mock_metrics_collector.assert_called_once_with(
            cpu_collector=mock_cpu_collector.return_value,
            memory_collector=mock_memory_collector.return_value,
            disk_collector=mock_disk_collector.return_value,
            network_collector=mock_network_collector.return_value,
        )

        mock_metrics_service.assert_called_once_with(
            http_client=mock_http_client.return_value,
            settings=settings,
            metrics_collector=mock_metrics_collector.return_value,
            outbox=mock_outbox.return_value,
        )

        mock_outbox.assert_called_once_with(Path(".") / "outbox.db")
        mock_outbox_sender.assert_called_once_with(
            mock_outbox.return_value,
            mock_http_client.return_value,
        )
        assert agent.outbox_sender is mock_outbox_sender.return_value

        assert isinstance(agent, Agent)


def test_create_agent_saves_the_credential_next_to_the_configuration(tmp_path):
    settings = Mock()
    settings.server_url = "http://localhost:3000"
    settings.agent_token = "ioe_token"
    settings.monitored_directories = []
    settings.ignored_patterns = []
    config_path = tmp_path / "agent.env"

    with (
        patch("src.main.default_monitored_directories", return_value=[]),
        patch("src.main.AgentSettings.from_environment", return_value=settings),
        patch("src.main.HttpClient"),
        patch("src.main.RegistrationService") as mock_registration_service,
        patch("src.main.Outbox"),
        patch("src.main.save_agent_token") as mock_save_agent_token,
    ):
        create_agent(tmp_path, config_path)

        save_token = mock_registration_service.call_args.kwargs["save_token"]
        save_token("ioa_credencial")

    mock_save_agent_token.assert_called_once_with(config_path, "ioa_credencial")


def test_create_file_observers_for_configured_directories():
    settings = Mock()
    settings.monitored_directories = [
        "C:/Users/test/Documents",
        "C:/Users/test/Desktop",
    ]
    settings.ignored_patterns = ["*.bak"]

    event_handler = Mock()

    with (
        patch("src.main.create_file_observer") as mock_factory,
        patch("src.main.os.path.isdir", return_value=True),
    ):
        observers = create_file_observers(
            settings=settings,
            event_handler=event_handler,
        )

    assert mock_factory.call_count == 2

    mock_factory.assert_any_call(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
        event_filter=ANY,
    )

    mock_factory.assert_any_call(
        directory="C:/Users/test/Desktop",
        event_handler=event_handler,
        event_filter=ANY,
    )

    event_filter = mock_factory.call_args.kwargs["event_filter"]
    assert event_filter.should_ignore("C:/Users/test/Desktop/copia.bak")

    assert len(observers) == 2


def test_resolve_uses_default_directories_when_none_configured(tmp_path):
    documents = tmp_path / "Documents"
    documents.mkdir()

    settings = Mock()
    settings.monitored_directories = []

    with patch(
        "src.main.default_monitored_directories",
        return_value=[str(documents)],
    ):
        assert resolve_monitored_directories(settings) == [str(documents)]


def test_resolve_skips_missing_directories(tmp_path, caplog):
    existing = tmp_path / "Compartilhado"
    existing.mkdir()

    settings = Mock()
    settings.monitored_directories = [
        str(existing),
        str(tmp_path / "nao-existe"),
    ]

    assert resolve_monitored_directories(settings) == [str(existing)]
    assert "Monitored directory not found" in caplog.text


def test_create_agent_configures_file_monitoring():
    settings = Mock()
    settings.server_url = "http://localhost:3000"
    settings.agent_token = "test-token"
    settings.monitored_directories = [
        "C:/Users/test/Documents",
    ]

    with (
        patch(
            "src.main.AgentSettings.from_environment",
            return_value=settings,
        ),
        patch("src.main.HttpClient"),
        patch("src.main.SystemInfoCollector"),
        patch("src.main.RegistrationService"),
        patch("src.main.CpuCollector"),
        patch("src.main.MemoryCollector"),
        patch("src.main.DiskCollector"),
        patch("src.main.NetworkCollector"),
        patch("src.main.MetricsCollector"),
        patch("src.main.MetricsService"),
        patch("src.main.Outbox"),
        patch("src.main.OutboxSender"),
        patch("src.main.FileEventService") as mock_file_event_service,
        patch(
            "src.main.FileObserverGroupService"
        ) as mock_file_observer_service,
        patch("src.main.create_file_observers") as mock_create_observers,
    ):
        mock_create_observers.return_value = [Mock()]

        agent = create_agent()

        mock_file_event_service.assert_called_once()
        mock_file_observer_service.assert_called_once()

        assert isinstance(agent, Agent)

def test_main_prints_version_without_starting_agent(capsys):
    from src.main import main

    with patch("src.main.create_agent") as mock_create_agent:
        main(["--version"])

    assert capsys.readouterr().out.startswith("InfraObserver Agent ")
    mock_create_agent.assert_not_called()


def test_main_loads_configuration_and_starts_agent(tmp_path):
    from src.main import main

    config_path = tmp_path / "agent.env"

    with (
        patch("src.main.load_configuration", return_value=config_path),
        patch("src.main.ensure_agent_id") as mock_ensure_agent_id,
        patch("src.main.create_agent") as mock_create_agent,
    ):
        main([])

    mock_ensure_agent_id.assert_called_once_with(ANY, tmp_path / "agent-id")
    mock_create_agent.assert_called_once_with(tmp_path, config_path)
    mock_create_agent.return_value.start.assert_called_once_with()


def test_main_stops_quietly_on_ctrl_c(caplog):
    from src.main import main

    with (
        patch("src.main.load_configuration", return_value=None),
        patch("src.main.ensure_agent_id"),
        patch("src.main.create_agent") as mock_create_agent,
    ):
        mock_create_agent.return_value.start.side_effect = KeyboardInterrupt

        with caplog.at_level(logging.INFO):
            main([])

    assert "InfraObserver Agent stopped" in caplog.text


def make_update_settings(hours=6):
    settings = Mock()
    settings.update_interval_hours = hours
    return settings


def test_update_service_only_for_the_installed_windows_agent(tmp_path):
    from src.main import create_update_service

    http_client = Mock()

    with (
        patch("src.main.sys.frozen", True, create=True),
        patch("src.main.platform.system", return_value="Windows"),
    ):
        service = create_update_service(make_update_settings(), http_client, tmp_path)
        disabled = create_update_service(make_update_settings(0), http_client, tmp_path)
        without_folder = create_update_service(make_update_settings(), http_client, None)

    assert service.download_directory == tmp_path / "updates"
    assert service.interval_seconds == 6 * 3600
    assert disabled is None
    assert without_folder is None


def test_no_update_service_when_running_from_source(tmp_path):
    from src.main import create_update_service

    with patch("src.main.platform.system", return_value="Windows"):
        assert create_update_service(make_update_settings(), Mock(), tmp_path) is None


def test_data_directory_is_next_to_the_config_file(tmp_path, monkeypatch):
    from src.main import resolve_data_directory

    monkeypatch.setenv("INFRAOBSERVER_DATA_DIR", "/data/agent")

    assert resolve_data_directory(tmp_path / "agent.env") == tmp_path
    assert resolve_data_directory(None) == Path("/data/agent")

    monkeypatch.delenv("INFRAOBSERVER_DATA_DIR")
    assert resolve_data_directory(None) == Path(".")
