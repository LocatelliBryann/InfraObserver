from unittest.mock import Mock, patch

from src.core.agent import Agent
from src.main import create_agent


def test_create_agent_builds_agent_with_required_dependencies():
    settings = Mock()
    settings.server_url = "http://localhost:3000"
    settings.agent_token = "test-token"

    with (
        patch("src.main.AgentSettings.from_environment", return_value=settings),
        patch("src.main.HttpClient") as mock_http_client,
        patch("src.main.SystemInfoCollector") as mock_system_info_collector,
        patch("src.main.RegistrationService") as mock_registration_service,
        patch("src.main.CpuCollector") as mock_cpu_collector,
        patch("src.main.MemoryCollector") as mock_memory_collector,
        patch("src.main.DiskCollector") as mock_disk_collector,
        patch("src.main.NetworkCollector") as mock_network_collector,
        patch("src.main.MetricsCollector") as mock_metrics_collector,
        patch("src.main.MetricsService") as mock_metrics_service,
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
        )

        assert isinstance(agent, Agent)