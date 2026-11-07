from datetime import datetime, timezone
from unittest.mock import Mock

from src.config.settings import AgentSettings
from src.services.file_event_service import FileEventService
from src.watchers.file_event import FileEvent, FileEventType


def test_file_event_service_sends_event_to_backend():
    http_client = Mock()
    settings = Mock(spec=AgentSettings)
    settings.agent_id = "550e8400-e29b-41d4-a716-446655440000"

    service = FileEventService(
        http_client=http_client,
        settings=settings,
    )

    occurred_at = datetime.now(timezone.utc)

    event = FileEvent(
        event_type=FileEventType.CREATE,
        file_path="C:/Users/test/document.txt",
        username="test-user",
        occurred_at=occurred_at,
    )

    service.send(event)

    http_client.post.assert_called_once_with(
        "/api/v1/file-events",
        {
            "agentId": settings.agent_id,
            "username": "test-user",
            "eventType": "CREATE",
            "filePath": "C:/Users/test/document.txt",
            "isDirectory": False,
            "occurredAt": occurred_at.isoformat(),
        },
    )


def test_file_event_service_sends_previous_path_of_moves():
    http_client = Mock()
    settings = Mock(spec=AgentSettings)
    settings.agent_id = "550e8400-e29b-41d4-a716-446655440000"

    service = FileEventService(http_client=http_client, settings=settings)

    event = FileEvent(
        event_type=FileEventType.MOVE,
        file_path="C:/Users/test/Arquivo/2025",
        username="test-user",
        occurred_at=datetime.now(timezone.utc),
        previous_path="C:/Users/test/Documents/2025",
        is_directory=True,
    )

    service.send(event)

    payload = http_client.post.call_args.args[1]

    assert payload["eventType"] == "MOVE"
    assert payload["previousPath"] == "C:/Users/test/Documents/2025"
    assert payload["isDirectory"] is True

def test_file_event_service_does_not_raise_when_backend_fails():
    http_client = Mock()
    http_client.post.side_effect = ConnectionError("server unavailable")
    settings = Mock(spec=AgentSettings)
    settings.agent_id = "550e8400-e29b-41d4-a716-446655440000"

    service = FileEventService(
        http_client=http_client,
        settings=settings,
    )

    event = FileEvent(
        event_type=FileEventType.DELETE,
        file_path="C:/Users/test/document.txt",
        username="test-user",
        occurred_at=datetime.now(timezone.utc),
    )

    assert service.send(event) is False
    http_client.post.assert_called_once()
