from unittest.mock import Mock, patch

from src.collectors.memory import MemoryCollector


def test_memory_collector_returns_used_and_total_memory():
    memory = Mock()
    memory.used = 4 * 1024**3
    memory.total = 8 * 1024**3

    with patch("src.collectors.memory.psutil.virtual_memory", return_value=memory):
        collector = MemoryCollector()

        result = collector.collect()

        assert result.used == 4 * 1024**3
        assert result.total == 8 * 1024**3

def test_memory_collector_returns_used_memory_not_greater_than_total():
    memory = Mock()
    memory.used = 4 * 1024**3
    memory.total = 8 * 1024**3

    with patch("src.collectors.memory.psutil.virtual_memory", return_value=memory):
        collector = MemoryCollector()

        result = collector.collect()

        assert 0 <= result.used <= result.total
