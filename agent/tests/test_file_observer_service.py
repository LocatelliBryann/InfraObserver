from unittest.mock import Mock

from src.services.file_observer_service import FileObserverService


def test_file_observer_service_starts_observer():
    observer = Mock()

    service = FileObserverService(
        observer=observer,
        directory="C:/Users/test/Documents",
    )

    service.start()

    observer.schedule.assert_called_once()
    observer.start.assert_called_once_with()


def test_file_observer_service_stops_observer():
    observer = Mock()

    service = FileObserverService(
        observer=observer,
        directory="C:/Users/test/Documents",
    )

    service.stop()

    observer.stop.assert_called_once_with()
    observer.join.assert_called_once_with()

def test_file_observer_service_schedules_file_watcher():
    observer = Mock()
    file_watcher = Mock()

    service = FileObserverService(
        observer=observer,
        directory="C:/Users/test/Documents",
        event_handler=file_watcher,
    )

    service.start()

    observer.schedule.assert_called_once_with(
        event_handler=file_watcher,
        path=str(service.directory),
        recursive=True,
    )