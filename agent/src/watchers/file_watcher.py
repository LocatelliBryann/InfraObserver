import time
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath
from typing import Callable

from watchdog.events import FileSystemEventHandler

from src.collectors.logged_user import get_logged_user
from src.watchers.file_event import FileEvent, FileEventType
from src.watchers.file_filter import FileEventFilter

# Um único "salvar" dispara vários avisos de alteração seguidos: dentro deste
# intervalo, alterações no mesmo arquivo viram um evento só.
DEFAULT_MODIFY_DEBOUNCE_SECONDS = 2.0

# Limite de caminhos lembrados para o agrupamento, para a memória não crescer.
MAX_TRACKED_PATHS = 2000


class FileWatcher(FileSystemEventHandler):
    def __init__(
        self,
        directory: str,
        event_handler: Callable[[FileEvent], None],
        username_provider: Callable[[], str] = get_logged_user,
        event_filter: FileEventFilter | None = None,
        modify_debounce_seconds: float = DEFAULT_MODIFY_DEBOUNCE_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.directory = Path(directory)
        self.event_handler = event_handler
        self.username_provider = username_provider
        self.event_filter = event_filter or FileEventFilter()
        self.modify_debounce_seconds = modify_debounce_seconds
        self.clock = clock
        self._last_change_at: dict[str, float] = {}

    def _emit(
        self,
        event_type: FileEventType,
        file_path: str,
        is_directory: bool,
        previous_path: str | None = None,
    ) -> None:
        self.event_handler(
            FileEvent(
                event_type=event_type,
                file_path=file_path,
                username=self.username_provider(),
                occurred_at=datetime.now(timezone.utc),
                previous_path=previous_path,
                is_directory=is_directory,
            )
        )

    def _remember_change(self, path: str) -> None:
        if len(self._last_change_at) >= MAX_TRACKED_PATHS:
            self._last_change_at.clear()

        self._last_change_at[path] = self.clock()

    def _changed_recently(self, path: str) -> bool:
        last_change = self._last_change_at.get(path)

        return (
            last_change is not None
            and self.clock() - last_change < self.modify_debounce_seconds
        )

    def on_created(self, event) -> None:
        if self.event_filter.should_ignore(event.src_path):
            return

        self._remember_change(event.src_path)
        self._emit(FileEventType.CREATE, event.src_path, event.is_directory)

    def on_modified(self, event) -> None:
        # Alterar uma pasta só significa que algo dentro dela mudou, e esse
        # algo já gera o próprio evento.
        if event.is_directory or self.event_filter.should_ignore(event.src_path):
            return

        if self._changed_recently(event.src_path):
            return

        self._remember_change(event.src_path)
        self._emit(FileEventType.MODIFY, event.src_path, False)

    def on_deleted(self, event) -> None:
        if self.event_filter.should_ignore(event.src_path):
            return

        self._last_change_at.pop(event.src_path, None)
        self._emit(FileEventType.DELETE, event.src_path, event.is_directory)

    def on_moved(self, event) -> None:
        source_ignored = self.event_filter.should_ignore(event.src_path)
        destination_ignored = self.event_filter.should_ignore(event.dest_path)

        if destination_ignored:
            return

        if source_ignored:
            # Programas como o Word salvam num arquivo temporário e depois o
            # renomeiam para o nome original: para o usuário, foi uma alteração.
            if not event.is_directory and not self._changed_recently(
                event.dest_path
            ):
                self._remember_change(event.dest_path)
                self._emit(FileEventType.MODIFY, event.dest_path, False)
            return

        same_folder = (
            PureWindowsPath(event.src_path).parent
            == PureWindowsPath(event.dest_path).parent
        )

        self._emit(
            FileEventType.RENAME if same_folder else FileEventType.MOVE,
            event.dest_path,
            event.is_directory,
            previous_path=event.src_path,
        )
