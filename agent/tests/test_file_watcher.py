from unittest.mock import Mock

import pytest

from src.watchers.file_event import FileEventType
from src.watchers.file_filter import FileEventFilter
from src.watchers.file_watcher import FileWatcher


class FakeClock:
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        return self.now


def make_event(src_path, dest_path=None, is_directory=False):
    event = Mock()
    event.src_path = src_path
    event.dest_path = dest_path
    event.is_directory = is_directory
    return event


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def handler():
    return Mock()


@pytest.fixture
def watcher(handler, clock):
    return FileWatcher(
        directory="C:/Users/test/Documents",
        event_handler=handler,
        username_provider=lambda: "maria",
        clock=clock,
    )


def emitted(handler):
    return [call.args[0] for call in handler.call_args_list]


def test_converts_created_event(watcher, handler):
    watcher.on_created(make_event("C:/Users/test/Documents/file.txt"))

    event = emitted(handler)[0]

    assert event.event_type == FileEventType.CREATE
    assert event.file_path == "C:/Users/test/Documents/file.txt"
    assert event.username == "maria"
    assert event.is_directory is False


def test_converts_deleted_event(watcher, handler):
    watcher.on_deleted(make_event("C:/Users/test/Documents/file.txt"))

    assert emitted(handler)[0].event_type == FileEventType.DELETE


def test_reports_created_and_deleted_directories(watcher, handler):
    watcher.on_created(make_event("C:/Users/test/Documents/2026", is_directory=True))
    watcher.on_deleted(make_event("C:/Users/test/Documents/2025", is_directory=True))

    events = emitted(handler)

    assert [event.event_type for event in events] == [
        FileEventType.CREATE,
        FileEventType.DELETE,
    ]
    assert all(event.is_directory for event in events)


def test_ignores_directory_modifications(watcher, handler):
    watcher.on_modified(make_event("C:/Users/test/Documents/2026", is_directory=True))

    handler.assert_not_called()


def test_converts_modified_event(watcher, handler):
    watcher.on_modified(make_event("C:/Users/test/Documents/file.txt"))

    assert emitted(handler)[0].event_type == FileEventType.MODIFY


def test_groups_repeated_modifications_of_the_same_file(watcher, handler, clock):
    path = "C:/Users/test/Documents/planilha.xlsx"

    watcher.on_modified(make_event(path))
    clock.now += 0.5
    watcher.on_modified(make_event(path))
    clock.now += 0.5
    watcher.on_modified(make_event(path))

    assert len(emitted(handler)) == 1

    clock.now += 5
    watcher.on_modified(make_event(path))

    assert len(emitted(handler)) == 2


def test_ignores_modification_right_after_creation(watcher, handler, clock):
    path = "C:/Users/test/Documents/novo.txt"

    watcher.on_created(make_event(path))
    clock.now += 0.2
    watcher.on_modified(make_event(path))

    assert [event.event_type for event in emitted(handler)] == [FileEventType.CREATE]


def test_reports_rename_in_the_same_folder_with_previous_path(watcher, handler):
    watcher.on_moved(
        make_event(
            "C:/Users/test/Documents/old.txt",
            "C:/Users/test/Documents/new.txt",
        )
    )

    event = emitted(handler)[0]

    assert event.event_type == FileEventType.RENAME
    assert event.file_path == "C:/Users/test/Documents/new.txt"
    assert event.previous_path == "C:/Users/test/Documents/old.txt"


def test_reports_move_to_another_folder(watcher, handler):
    watcher.on_moved(
        make_event(
            "C:\\Users\\test\\Downloads\\nota.pdf",
            "C:\\Users\\test\\Documents\\Notas\\nota.pdf",
        )
    )

    event = emitted(handler)[0]

    assert event.event_type == FileEventType.MOVE
    assert event.previous_path == "C:\\Users\\test\\Downloads\\nota.pdf"


def test_reports_moved_directories(watcher, handler):
    watcher.on_moved(
        make_event(
            "C:/Users/test/Documents/2025",
            "C:/Users/test/Documents/Arquivo/2025",
            is_directory=True,
        )
    )

    event = emitted(handler)[0]

    assert event.event_type == FileEventType.MOVE
    assert event.is_directory is True


def test_ignores_temporary_files(watcher, handler):
    watcher.on_created(make_event("C:/Users/test/Documents/~$relatorio.docx"))
    watcher.on_modified(make_event("C:/Users/test/Documents/~WRL0001.tmp"))
    watcher.on_deleted(make_event("C:/Users/test/Documents/Thumbs.db"))

    handler.assert_not_called()


def test_treats_temporary_file_saved_over_original_as_modification(watcher, handler):
    # Word: grava ~WRD0001.tmp e depois renomeia para o nome original.
    watcher.on_moved(
        make_event(
            "C:/Users/test/Documents/~WRD0001.tmp",
            "C:/Users/test/Documents/relatorio.docx",
        )
    )

    event = emitted(handler)[0]

    assert event.event_type == FileEventType.MODIFY
    assert event.file_path == "C:/Users/test/Documents/relatorio.docx"
    assert event.previous_path is None


def test_ignores_rename_to_a_temporary_file(watcher, handler):
    watcher.on_moved(
        make_event(
            "C:/Users/test/Documents/relatorio.docx",
            "C:/Users/test/Documents/~WRL0002.tmp",
        )
    )

    handler.assert_not_called()


def test_uses_a_custom_filter(handler, clock):
    watcher = FileWatcher(
        directory="D:/Dados",
        event_handler=handler,
        username_provider=lambda: "joao",
        event_filter=FileEventFilter(extra_patterns=["*.bak"]),
        clock=clock,
    )

    watcher.on_created(make_event("D:/Dados/copia.bak"))
    watcher.on_created(make_event("D:/Dados/contrato.pdf"))

    assert [event.file_path for event in emitted(handler)] == ["D:/Dados/contrato.pdf"]


def test_forgets_old_paths_when_too_many_are_tracked(watcher, handler, clock, monkeypatch):
    monkeypatch.setattr("src.watchers.file_watcher.MAX_TRACKED_PATHS", 2)

    watcher.on_modified(make_event("D:/a.txt"))
    watcher.on_modified(make_event("D:/b.txt"))
    watcher.on_modified(make_event("D:/c.txt"))
    watcher.on_modified(make_event("D:/a.txt"))

    assert len(emitted(handler)) == 4
