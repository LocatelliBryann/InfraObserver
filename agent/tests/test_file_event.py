from datetime import datetime, timezone

from src.watchers.file_event import FileEvent, FileEventType


def test_file_event_contains_required_information():
    occurred_at = datetime.now(timezone.utc)

    event = FileEvent(
        event_type=FileEventType.CREATE,
        file_path="C:/Users/test/document.txt",
        username="test-user",
        occurred_at=occurred_at,
    )

    assert event.event_type == FileEventType.CREATE
    assert event.file_path == "C:/Users/test/document.txt"
    assert event.username == "test-user"
    assert event.occurred_at == occurred_at


def test_file_event_type_contains_supported_operations():
    assert FileEventType.CREATE.value == "CREATE"
    assert FileEventType.MODIFY.value == "MODIFY"
    assert FileEventType.DELETE.value == "DELETE"
    assert FileEventType.RENAME.value == "RENAME"