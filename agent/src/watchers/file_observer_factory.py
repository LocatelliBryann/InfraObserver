
from typing import Callable

from watchdog.observers import Observer

from src.watchers.file_filter import FileEventFilter
from src.watchers.file_watcher import FileWatcher


def create_file_observer(
    directory: str,
    event_handler: Callable,
    event_filter: FileEventFilter | None = None,
) -> Observer:
    file_watcher = FileWatcher(
        directory=directory,
        event_handler=event_handler,
        event_filter=event_filter,
    )

    observer = Observer()

    observer.schedule(
        event_handler=file_watcher,
        path=directory,
        recursive=True,
    )

    return observer