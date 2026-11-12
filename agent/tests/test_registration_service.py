import pytest
from unittest.mock import Mock

from src.collectors.system_info import SystemInfo
from src.config.settings import AgentSettings
from src.services.registration_service import EnrollmentError, RegistrationService
from src.version import __version__


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
            "agentVersion": __version__,
        },
    )

def make_enrollment_service(token="ioe_instalacao", response_body=None, save_token=None):
    http_client = Mock()
    http_client.agent_token = token
    http_client.post.return_value.json.return_value = (
        {"credential": "ioa_credencial", "endpoint": {"id": 1}}
        if response_body is None
        else response_body
    )

    settings = AgentSettings(
        server_url="http://localhost:3000",
        agent_token=token,
        agent_id="550e8400-e29b-41d4-a716-446655440000",
    )
    system_info_collector = Mock()
    system_info_collector.collect.return_value = SystemInfo(
        hostname="TEST-PC",
        ip_address="192.168.1.100",
        os_name="Windows",
        os_version="11",
    )
    environ = {}

    service = RegistrationService(
        http_client=http_client,
        settings=settings,
        system_info_collector=system_info_collector,
        save_token=save_token,
        environ=environ,
    )

    return service, http_client, environ


def test_enrollment_token_is_exchanged_for_a_credential():
    save_token = Mock()
    service, http_client, environ = make_enrollment_service(save_token=save_token)

    service.register()

    http_client.post.assert_called_once()
    path, payload = http_client.post.call_args.args
    assert path == "/api/v1/agents/enroll"
    assert payload["agentId"] == "550e8400-e29b-41d4-a716-446655440000"
    assert payload["agentVersion"] == __version__

    assert http_client.agent_token == "ioa_credencial"
    assert environ["INFRAOBSERVER_AGENT_TOKEN"] == "ioa_credencial"
    save_token.assert_called_once_with("ioa_credencial")


def test_after_enrolling_the_next_registration_uses_the_normal_route():
    service, http_client, _ = make_enrollment_service(save_token=Mock())

    service.register()
    service.register()

    assert [call.args[0] for call in http_client.post.call_args_list] == [
        "/api/v1/agents/enroll",
        "/api/v1/endpoints/register",
    ]


def test_shared_tokens_and_credentials_do_not_enroll():
    for token in ("token-antigo", "ioa_credencial"):
        service, http_client, _ = make_enrollment_service(token=token)

        service.register()

        assert http_client.post.call_args.args[0] == "/api/v1/endpoints/register"


def test_enrollment_fails_without_a_credential_in_the_response():
    save_token = Mock()
    service, http_client, _ = make_enrollment_service(
        response_body={"message": "ok"},
        save_token=save_token,
    )

    with pytest.raises(EnrollmentError):
        service.register()

    assert http_client.agent_token == "ioe_instalacao"
    save_token.assert_not_called()


def test_enrollment_keeps_working_when_the_credential_cannot_be_saved(caplog):
    save_token = Mock(side_effect=PermissionError("acesso negado"))
    service, http_client, _ = make_enrollment_service(save_token=save_token)

    service.register()

    assert http_client.agent_token == "ioa_credencial"
    assert "could not be saved" in caplog.text


def test_enrollment_without_a_configuration_file_only_warns(caplog):
    service, http_client, _ = make_enrollment_service(save_token=None)

    service.register()

    assert http_client.agent_token == "ioa_credencial"
    assert "was not saved" in caplog.text
