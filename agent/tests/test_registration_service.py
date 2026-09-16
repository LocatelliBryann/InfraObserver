from unittest.mock import Mock

from src.services.registration_service import RegistrationService


def test_registration_service_registers_agent():
    http_client = Mock()

    service = RegistrationService(
        http_client=http_client,
        agent_id="550e8400-e29b-41d4-a716-446655440000",
        hostname="TEST-PC",
        ip_address="192.168.1.100",
        os_name="Windows",
        os_version="11",
    )

    service.register()

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