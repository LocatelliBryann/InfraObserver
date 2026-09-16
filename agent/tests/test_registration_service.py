from unittest.mock import Mock

from src.collectors.system_info import SystemInfo
from src.config.settings import AgentSettings
from src.services.registration_service import RegistrationService


def test_registration_service_registers_agent_using_settings_and_system_info():
    http_client = Mock()

    settings = AgentSettings(
        server_url="http://localhost:3000",
        agent_token="test-token",
        agent_id="550e8400-e29b-41d4-a716-446655440000",
    )

    system_info = SystemInfo(
        hostname="TEST-PC",
        ip_address="192.168.1.100",
        os_name="Windows",
        os_version="11",
    )

    system_info_collector = Mock()
    system_info_collector.collect.return_value = system_info

    service = RegistrationService(
        http_client=http_client,
        settings=settings,
        system_info_collector=system_info_collector,
    )

    service.register()

    system_info_collector.collect.assert_called_once_with()

    http_client.post.assert_called_once_with(
        "/api/v1/endpoints/register",
        {
            "agentId": "550e8400-e29b-41d4-a716-446655440000",
            "hostname": "TEST-PC",
            "ipAddress": "192.168.1.100",
            "osName": "Windows",
            "osVersion": "11",
        },
    )