from unittest.mock import patch

from src.collectors.cpu import CpuCollector


def test_cpu_collector_returns_cpu_percentage():
    with patch("src.collectors.cpu.psutil.cpu_percent") as mock_cpu_percent:
        mock_cpu_percent.return_value = 42.5

        collector = CpuCollector()

        result = collector.collect()

        assert result == 42.5
        mock_cpu_percent.assert_called_once_with(interval=0.1)

def test_cpu_collector_returns_value_between_zero_and_hundred():
    with patch("src.collectors.cpu.psutil.cpu_percent") as mock_cpu_percent:
        mock_cpu_percent.return_value = 87.3

        collector = CpuCollector()

        result = collector.collect()

        assert 0 <= result <= 100