from src.config.settings import AgentSettings
from src.services.http_client import HttpClient
from src.watchers.file_event import FileEvent


class FileEventService:
    def __init__(
        self,
        http_client: HttpClient,
        settings: AgentSettings,
    ):
        self.http_client = http_client
        self.settings = settings

    def send(self, event: FileEvent) -> None:
        payload = {
            "agentId": str(self.settings.agent_id),
            "username": event.username,
            "eventType": event.event_type.value,
            "filePath": event.file_path,
            "occurredAt": event.occurred_at.isoformat(),
        }

        self.http_client.post(
            "/api/v1/file-events",
            payload,
        )