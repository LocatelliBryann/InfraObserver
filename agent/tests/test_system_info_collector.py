from unittest.mock import patch

from src.collectors.system_info import SystemInfoCollector


def test_system_info_collector_collects_endpoint_information():
    with (
        patch("src.collectors.system_info.socket.gethostname") as mock_hostname,
        patch("src.collectors.system_info.platform.system") as mock_system,
        patch("src.collectors.system_info.platform.release") as mock_release,
        patch(
            "src.collectors.system_info.socket.gethostbyname"
        ) as mock_ip,
    ):
        mock_hostname.return_value = "TEST-PC"
        mock_system.return_value = "Windows"
        mock_release.return_value = "11"
        mock_ip.return_value = "192.168.1.100"

        collector = SystemInfoCollector()

        result = collector.collect()

        assert result.hostname == "TEST-PC"
        assert result.ip_address == "192.168.1.100"
        assert result.os_name == "Windows"
        assert result.os_version == "11"

def test_system_info_collector_raises_when_ip_cannot_be_resolved():
    with (
        patch("src.collectors.system_info.socket.gethostname") as mock_hostname,
        patch(
            "src.collectors.system_info.socket.gethostbyname"
        ) as mock_ip,
    ):
        mock_hostname.return_value = "TEST-PC"
        mock_ip.side_effect = OSError("Unable to resolve hostname")

        collector = SystemInfoCollector()

        try:
            collector.collect()
            assert False, "Expected RuntimeError"
        except RuntimeError as error:
            assert str(error) == "Unable to determine endpoint IP address"