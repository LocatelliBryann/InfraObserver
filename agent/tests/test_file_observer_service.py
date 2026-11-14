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

def make_observer(path: str, start_error: Exception | None = None):
    observer = Mock()
    emitter = Mock()
    emitter.watch.path = path
    observer.emitters = [emitter]
    if start_error is not None:
        observer.start.side_effect = start_error
    return observer


def test_group_keeps_monitoring_other_directories_when_one_fails(caplog):
    from src.services.file_observer_service import FileObserverGroupService

    denied = make_observer("C:/Users/Usuário Padrão/Desktop", PermissionError("Acesso negado"))
    allowed = make_observer("C:/Users/maria/Desktop")
    group = FileObserverGroupService([denied, allowed])

    group.start()
    group.stop()

    allowed.start.assert_called_once_with()
    allowed.stop.assert_called_once_with()
    allowed.join.assert_called_once_with()
    denied.stop.assert_not_called()
    denied.join.assert_not_called()
    assert "Could not monitor C:/Users/Usuário Padrão/Desktop: Acesso negado" in caplog.text


def test_group_logs_error_when_no_directory_can_be_monitored(caplog):
    from src.services.file_observer_service import FileObserverGroupService

    observer = Mock()
    observer.emitters = None
    observer.start.side_effect = OSError("offline")
    group = FileObserverGroupService([observer])

    group.start()

    assert "Could not monitor unknown directory: offline" in caplog.text
    assert "No directory could be monitored" in caplog.text


def test_group_replace_stops_the_old_folders_and_starts_the_new_ones():
    from src.services.file_observer_service import FileObserverGroupService

    old = Mock()
    new = Mock()
    group = FileObserverGroupService([old])
    group.start()

    group.replace([new])

    old.stop.assert_called_once()
    old.join.assert_called_once()
    new.start.assert_called_once()
    assert group.started == [new]
