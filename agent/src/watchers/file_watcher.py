from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEventHandler

from src.watchers.file_event import FileEvent, FileEventType


class FileWatcher(FileSystemEventHandler):
    def __init__(
        self,
        directory: str,
        event_handler: Callable[[FileEvent], None],
    ):
        self.directory = Path(directory)
        self.event_handler = event_handler

    def _handle_event(
        self,
        event,
        event_type: FileEventType,
    ) -> None:
        if event.is_directory:
            return

        file_event = FileEvent(
            event_type=event_type,
            file_path=event.src_path,
            username="unknown",
            occurred_at=datetime.now(timezone.utc),
        )

        self.event_handler(file_event)

    def on_created(self, event) -> None:
        self._handle_event(event, FileEventType.CREATE)

    def on_modified(self, event) -> None:
        self._handle_event(event, FileEventType.MODIFY)

    def on_deleted(self, event) -> None:
        self._handle_event(event, FileEventType.DELETE)

    def on_moved(self, event) -> None:
        if event.is_directory:
            return

        file_event = FileEvent(
            event_type=FileEventType.RENAME,
            file_path=event.dest_path,
            username="unknown",
            occurred_at=datetime.now(timezone.utc),
        )

        self.event_handler(file_event)