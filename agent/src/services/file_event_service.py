import logging

from src.config.settings import AgentSettings
from src.services.http_client import HttpClient
from src.watchers.file_event import FileEvent

logger = logging.getLogger(__name__)


class FileEventService:
    def __init__(
        self,
        http_client: HttpClient,
        settings: AgentSettings,
        outbox=None,
    ):
        self.http_client = http_client
        self.settings = settings
        # Com a fila, o evento é guardado e enviado em segundo plano; sem rede,
        # ele espera a conexão voltar em vez de se perder.
        self.outbox = outbox

    def send(self, event: FileEvent) -> bool:
        payload = {
            "agentId": str(self.settings.agent_id),
            "username": event.username,
            "eventType": event.event_type.value,
            "filePath": event.file_path,
            "isDirectory": event.is_directory,
            "occurredAt": event.occurred_at.isoformat(),
        }

        if event.previous_path:
            payload["previousPath"] = event.previous_path

        # Roda dentro da thread do watchdog: uma exceção aqui derrubaria
        # o monitoramento do diretório, então o erro é só registrado.
        try:
            if self.outbox is not None:
                self.outbox.put("/api/v1/file-events", payload)
            else:
                self.http_client.post(
                    "/api/v1/file-events",
                    payload,
                )
        except Exception:
            logger.exception(
                "Failed to send file event for %s",
                event.file_path,
            )
            return False

        return True
