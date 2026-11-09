from datetime import datetime, timezone

from src.collectors.metrics import MetricsCollector
from src.config.settings import AgentSettings
from src.services.http_client import HttpClient


class MetricsService:
    def __init__(
        self,
        http_client: HttpClient,
        settings: AgentSettings,
        metrics_collector: MetricsCollector,
        outbox=None,
    ):
        self.http_client = http_client
        self.settings = settings
        self.metrics_collector = metrics_collector
        self.outbox = outbox

    def collect_and_send(self) -> None:
        metrics = self.metrics_collector.collect()

        payload = {
            "agentId": str(self.settings.agent_id),
            "cpuPercent": metrics.cpu_percent,
            "memoryUsed": metrics.memory_used,
            "memoryTotal": metrics.memory_total,
            "diskUsed": metrics.disk_used,
            "diskTotal": metrics.disk_total,
            "netBytesSent": metrics.net_bytes_sent,
            "netBytesRecv": metrics.net_bytes_recv,
            "collectedAt": datetime.now(timezone.utc).isoformat(),
        }

        # Com a fila, a coleta feita sem rede é enviada depois, com o horário
        # original, e o histórico não fica com buraco.
        if self.outbox is not None:
            self.outbox.put("/api/v1/metrics", payload)
            return

        self.http_client.post(
            "/api/v1/metrics",
            payload,
        )