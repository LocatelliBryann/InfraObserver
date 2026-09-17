
from unittest.mock import Mock, patch

from src.services.file_event_service import FileEventService
from src.watchers.file_event import FileEventType
from src.watchers.file_watcher import FileWatcher
from src.watchers.file_observer_factory import create_file_observer


def test_create_file_observer_builds_observer_with_file_watcher():
    event_service = Mock(spec=FileEventService)

    with patch(
        "src.watchers.file_observer_factory.Observer"
    ) as mock_observer:
        observer = create_file_observer(
            directory="C:/Users/test/Documents",
            event_handler=event_service.send,
        )

    assert observer is mock_observer.return_value

    mock_observer.return_value.schedule.assert_called_once()

    scheduled_handler = (
        mock_observer.return_value.schedule.call_args.kwargs["event_handler"]
    )

    assert isinstance(scheduled_handler, FileWatcher)
    assert scheduled_handler.directory.as_posix() == (
        "C:/Users/test/Documents"
    )