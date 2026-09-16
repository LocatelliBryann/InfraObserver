from unittest.mock import Mock

from src.collectors.cpu import CpuCollector
from src.collectors.disk import DiskCollector
from src.collectors.memory import MemoryCollector
from src.collectors.metrics import MetricsCollector
from src.collectors.network import NetworkCollector


def test_metrics_collector_aggregates_all_metrics():
    cpu_collector = Mock(spec=CpuCollector)
    cpu_collector.collect.return_value = 42.5

    memory_collector = Mock(spec=MemoryCollector)
    memory_collector.collect.return_value = Mock(
        used=4 * 1024**3,
        total=8 * 1024**3,
    )

    disk_collector = Mock(spec=DiskCollector)
    disk_collector.collect.return_value = Mock(
        used=100 * 1024**3,
        total=500 * 1024**3,
    )

    network_collector = Mock(spec=NetworkCollector)
    network_collector.collect.return_value = Mock(
        bytes_sent=1024,
        bytes_recv=2048,
    )

    collector = MetricsCollector(
        cpu_collector=cpu_collector,
        memory_collector=memory_collector,
        disk_collector=disk_collector,
        network_collector=network_collector,
    )

    result = collector.collect()

    assert result.cpu_percent == 42.5

    assert result.memory_used == 4 * 1024**3
    assert result.memory_total == 8 * 1024**3

    assert result.disk_used == 100 * 1024**3
    assert result.disk_total == 500 * 1024**3

    assert result.net_bytes_sent == 1024
    assert result.net_bytes_recv == 2048

    cpu_collector.collect.assert_called_once_with()
    memory_collector.collect.assert_called_once_with()
    disk_collector.collect.assert_called_once_with()
    network_collector.collect.assert_called_once_with()

def test_metrics_collector_propagates_collector_error():
    cpu_collector = Mock(spec=CpuCollector)
    cpu_collector.collect.side_effect = RuntimeError("CPU collection failed")

    memory_collector = Mock(spec=MemoryCollector)
    disk_collector = Mock(spec=DiskCollector)
    network_collector = Mock(spec=NetworkCollector)

    collector = MetricsCollector(
        cpu_collector=cpu_collector,
        memory_collector=memory_collector,
        disk_collector=disk_collector,
        network_collector=network_collector,
    )

    try:
        collector.collect()
        assert False, "Expected RuntimeError"
    except RuntimeError as error:
        assert str(error) == "CPU collection failed"

    memory_collector.collect.assert_not_called()
    disk_collector.collect.assert_not_called()
    network_collector.collect.assert_not_called()