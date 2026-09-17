from unittest.mock import Mock

from src.watchers.file_event import FileEventType
from src.watchers.file_watcher import FileWatcher


def test_file_watcher_converts_created_event():
    event_handler = Mock()

    watcher = FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
    )

    event = Mock()
    event.is_directory = False
    event.src_path = "C:/Users/test/Documents/file.txt"

    watcher.on_created(event)

    event_handler.assert_called_once()
    file_event = event_handler.call_args.args[0]

    assert file_event.event_type == FileEventType.CREATE
    assert file_event.file_path == event.src_path


def test_file_watcher_ignores_directory_events():
    event_handler = Mock()

    watcher = FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
    )

    event = Mock()
    event.is_directory = True

    watcher.on_created(event)

    event_handler.assert_not_called()

def test_file_watcher_converts_modified_event():
    event_handler = Mock()

    watcher = FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
    )

    event = Mock()
    event.is_directory = False
    event.src_path = "C:/Users/test/Documents/file.txt"

    watcher.on_modified(event)

    file_event = event_handler.call_args.args[0]

    assert file_event.event_type == FileEventType.MODIFY
    assert file_event.file_path == event.src_path


def test_file_watcher_converts_deleted_event():
    event_handler = Mock()

    watcher = FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
    )

    event = Mock()
    event.is_directory = False
    event.src_path = "C:/Users/test/Documents/file.txt"

    watcher.on_deleted(event)

    file_event = event_handler.call_args.args[0]

    assert file_event.event_type == FileEventType.DELETE
    assert file_event.file_path == event.src_path


def test_file_watcher_converts_renamed_event():
    event_handler = Mock()

    watcher = FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=event_handler,
    )

    event = Mock()
    event.is_directory = False
    event.src_path = "C:/Users/test/Documents/old.txt"
    event.dest_path = "C:/Users/test/Documents/new.txt"

    watcher.on_moved(event)

    file_event = event_handler.call_args.args[0]

    assert file_event.event_type == FileEventType.RENAME
    assert file_event.file_path == event.dest_path
