from unittest.mock import Mock

from src.collectors.metrics import MetricSnapshot
from src.config.settings import AgentSettings
from src.services.metrics_service import MetricsService


def test_metrics_service_collects_and_sends_metrics():
    http_client = Mock()

    settings = AgentSettings(
        server_url="http://localhost:3000",
        agent_token="test-token",
        agent_id="550e8400-e29b-41d4-a716-446655440000",
    )

    metrics_collector = Mock()
    metrics_collector.collect.return_value = MetricSnapshot(
        cpu_percent=42.5,
        memory_used=4 * 1024**3,
        memory_total=8 * 1024**3,
        disk_used=100 * 1024**3,
        disk_total=500 * 1024**3,
        net_bytes_sent=1024,
        net_bytes_recv=2048,
    )

    service = MetricsService(
        http_client=http_client,
        settings=settings,
        metrics_collector=metrics_collector,
    )

    service.collect_and_send()

    metrics_collector.collect.assert_called_once_with()

    http_client.post.assert_called_once()

    path, payload = http_client.post.call_args.args

    assert path == "/api/v1/metrics"
    assert payload["agentId"] == "550e8400-e29b-41d4-a716-446655440000"

    assert payload["cpuPercent"] == 42.5
    assert payload["memoryUsed"] == 4 * 1024**3
    assert payload["memoryTotal"] == 8 * 1024**3
    assert payload["diskUsed"] == 100 * 1024**3
    assert payload["diskTotal"] == 500 * 1024**3
    assert payload["netBytesSent"] == 1024
    assert payload["netBytesRecv"] == 2048

    assert "collectedAt" in payload