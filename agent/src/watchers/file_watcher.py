from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEventHandler

from src.collectors.logged_user import get_logged_user
from src.watchers.file_event import FileEvent, FileEventType


class FileWatcher(FileSystemEventHandler):
    def __init__(
        self,
        directory: str,
        event_handler: Callable[[FileEvent], None],
        username_provider: Callable[[], str] = get_logged_user,
    ):
        self.directory = Path(directory)
        self.event_handler = event_handler
        self.username_provider = username_provider

    def _build_event(
        self,
        event_type: FileEventType,
        file_path: str,
    ) -> FileEvent:
        return FileEvent(
            event_type=event_type,
            file_path=file_path,
            username=self.username_provider(),
            occurred_at=datetime.now(timezone.utc),
        )

    def _handle_event(
        self,
        event,
        event_type: FileEventType,
    ) -> None:
        if event.is_directory:
            return

        self.event_handler(
            self._build_event(event_type, event.src_path),
        )

    def on_created(self, event) -> None:
        self._handle_event(event, FileEventType.CREATE)

    def on_modified(self, event) -> None:
        self._handle_event(event, FileEventType.MODIFY)

    def on_deleted(self, event) -> None:
        self._handle_event(event, FileEventType.DELETE)

    def on_moved(self, event) -> None:
        if event.is_directory:
            return

        self.event_handler(
            self._build_event(FileEventType.RENAME, event.dest_path),
        )
