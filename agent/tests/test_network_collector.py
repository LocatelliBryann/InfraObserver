from unittest.mock import Mock, patch

from src.collectors.network import NetworkCollector


def test_network_collector_returns_bytes_sent_and_received():
    counters = Mock()
    counters.bytes_sent = 1024
    counters.bytes_recv = 2048

    with patch(
        "src.collectors.network.psutil.net_io_counters",
        return_value=counters,
    ) as mock_net_io_counters:
        collector = NetworkCollector()

        result = collector.collect()

        assert result.bytes_sent == 1024
        assert result.bytes_recv == 2048
        mock_net_io_counters.assert_called_once_with()

def test_network_collector_returns_non_negative_values():
    counters = Mock()
    counters.bytes_sent = 1024
    counters.bytes_recv = 2048

    with patch(
        "src.collectors.network.psutil.net_io_counters",
        return_value=counters,
    ):
        collector = NetworkCollector()

        result = collector.collect()

        assert result.bytes_sent >= 0
        assert result.bytes_recv >= 0
