from unittest.mock import Mock, patch

from src.collectors.disk import DiskCollector


def test_disk_collector_returns_used_and_total_disk_space():
    disk = Mock()
    disk.used = 100 * 1024**3
    disk.total = 500 * 1024**3

    with patch(
        "src.collectors.disk.psutil.disk_usage",
        return_value=disk,
    ) as mock_disk_usage:
        collector = DiskCollector()

        result = collector.collect()

        assert result.used == 100 * 1024**3
        assert result.total == 500 * 1024**3
        mock_disk_usage.assert_called_once_with("/")

def test_disk_collector_returns_used_space_not_greater_than_total():
    disk = Mock()
    disk.used = 100 * 1024**3
    disk.total = 500 * 1024**3

    with patch(
        "src.collectors.disk.psutil.disk_usage",
        return_value=disk,
    ):
        collector = DiskCollector()

        result = collector.collect()

        assert 0 <= result.used <= result.total
