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
        modified_time=lambda path: None,
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


def make_noise_watcher(handler, clock, modified_at):
    return FileWatcher(
        directory="C:/Users/test/Desktop",
        event_handler=handler,
        username_provider=lambda: "maria",
        clock=clock,
        modified_time=lambda path: modified_at,
        wall_clock=lambda: 1_000_000.0,
    )


def test_ignores_files_that_were_only_read(handler, clock):
    # Atalho da Steam criado em julho e só lido agora: o Windows avisa, mas
    # a data de modificação continua a antiga.
    watcher = make_noise_watcher(handler, clock, modified_at=1_000_000.0 - 90 * 24 * 3600)

    watcher.on_modified(make_event("C:/Users/test/Desktop/Jogo.url"))

    handler.assert_not_called()


def test_reports_files_whose_content_just_changed(handler, clock):
    watcher = make_noise_watcher(handler, clock, modified_at=1_000_000.0 - 1)

    watcher.on_modified(make_event("C:/Users/test/Desktop/planilha.xlsx"))

    assert [event.event_type for event in emitted(handler)] == [FileEventType.MODIFY]


def test_tolerates_a_file_server_with_a_different_clock(handler, clock):
    ahead = make_noise_watcher(handler, clock, modified_at=1_000_000.0 + 30)
    behind = make_noise_watcher(handler, clock, modified_at=1_000_000.0 - 45)

    ahead.on_modified(make_event("//servidor/financeiro/a.xlsx"))
    behind.on_modified(make_event("//servidor/financeiro/b.xlsx"))

    assert len(emitted(handler)) == 2


def test_reads_the_modification_time_from_disk(tmp_path):
    from src.watchers.file_watcher import read_modified_time

    file = tmp_path / "nota.txt"
    file.write_text("x", encoding="utf-8")

    assert read_modified_time(str(file)) == file.stat().st_mtime
    assert read_modified_time(str(tmp_path / "apagado.txt")) is None


def test_reports_real_writes_and_skips_reads_on_a_real_folder(tmp_path, handler):
    import os
    import time as real_time

    written = tmp_path / "escrito.txt"
    written.write_text("novo", encoding="utf-8")
    old = tmp_path / "antigo.txt"
    old.write_text("velho", encoding="utf-8")
    month_ago = real_time.time() - 30 * 24 * 3600
    os.utime(old, (month_ago, month_ago))

    # No Windows a pasta temporária do pytest fica dentro de AppData, que o
    # filtro padrão ignora; aqui só interessa a data de modificação.
    accept_all = Mock()
    accept_all.should_ignore.return_value = False

    watcher = FileWatcher(
        directory=str(tmp_path),
        event_handler=handler,
        username_provider=lambda: "maria",
        event_filter=accept_all,
    )
    watcher.on_modified(make_event(str(written)))
    watcher.on_modified(make_event(str(old)))

    assert [event.file_path for event in emitted(handler)] == [str(written)]
