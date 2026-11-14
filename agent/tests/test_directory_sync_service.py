import json
from unittest.mock import Mock

import pytest
import requests

from src.services.directory_sync_service import (
    DirectorySyncService,
    RemoteDirectoriesStore,
    SavedDirectories,
)

AGENT_ID = "550e8400-e29b-41d4-a716-446655440030"
LOCAL = [r"C:\Users\ana\Documents", r"C:\Users\ana\Desktop"]
CONFIG_PATH = f"/api/v1/agents/{AGENT_ID}/config"


def response(body):
    mock = Mock()
    mock.json.return_value = body
    return mock


def http_error(status):
    error = requests.HTTPError()
    error.response = Mock(status_code=status)
    return error


def create_sync(tmp_path, body=None, current=None, updated_at=None, apply_result=None):
    http_client = Mock()
    http_client.get.return_value = response(
        body
        if body is not None
        else {"source": "installation", "monitoredDirectories": [], "updatedAt": None}
    )
    apply = Mock(return_value=apply_result or ([], []))
    store = RemoteDirectoriesStore(tmp_path / "remote-directories.json")
    sync = DirectorySyncService(
        http_client=http_client,
        agent_id=AGENT_ID,
        local_directories=LOCAL,
        apply=apply,
        store=store,
        current=list(LOCAL if current is None else current),
        current_updated_at=updated_at,
        initial_result=(list(LOCAL), []),
    )
    return sync, http_client, apply, store


def reported(http_client):
    return [call.args for call in http_client.post.call_args_list]


def test_first_check_reports_what_is_monitored_without_changing(tmp_path):
    sync, http_client, apply, _store = create_sync(tmp_path)

    assert sync.check() is False

    http_client.get.assert_called_once_with(CONFIG_PATH)
    apply.assert_not_called()
    assert reported(http_client) == [
        (f"{CONFIG_PATH}/status", {"monitoredDirectories": LOCAL, "missingDirectories": []})
    ]

    # Sem mudança, não informa de novo.
    sync.check()
    assert len(reported(http_client)) == 1


def test_applies_the_folders_from_the_dashboard_and_saves_them(tmp_path):
    body = {
        "source": "endpoint",
        "monitoredDirectories": [r"D:\Dados", r"E:\Nada"],
        "updatedAt": "2026-11-14T12:00:00.000Z",
    }
    sync, http_client, apply, store = create_sync(
        tmp_path, body=body, apply_result=([r"D:\Dados"], [r"E:\Nada"])
    )

    assert sync.check() is True

    apply.assert_called_once_with([r"D:\Dados", r"E:\Nada"])
    assert reported(http_client)[-1] == (
        f"{CONFIG_PATH}/status",
        {"monitoredDirectories": [r"D:\Dados"], "missingDirectories": [r"E:\Nada"]},
    )
    assert store.load() == SavedDirectories(
        directories=[r"D:\Dados", r"E:\Nada"],
        updated_at="2026-11-14T12:00:00.000Z",
        source="endpoint",
    )


def test_client_list_without_folders_stops_watching_folders(tmp_path):
    # Cartório: as estações seguem o cliente, que não monitora pastas locais.
    sync, http_client, apply, store = create_sync(
        tmp_path,
        body={"source": "client", "monitoredDirectories": [], "updatedAt": "t1"},
        apply_result=([], []),
    )

    assert sync.check() is True

    apply.assert_called_once_with([])
    assert reported(http_client)[-1][1] == {"monitoredDirectories": [], "missingDirectories": []}
    assert store.load() == SavedDirectories(directories=[], updated_at="t1", source="client")


def test_installation_source_goes_back_to_the_installation_folders(tmp_path):
    sync, _http_client, apply, store = create_sync(
        tmp_path,
        body={"source": "installation", "monitoredDirectories": [], "updatedAt": "2026-11-14T13:00:00.000Z"},
        current=[r"D:\Dados"],
        updated_at="2026-11-14T12:00:00.000Z",
        apply_result=(LOCAL, []),
    )

    assert sync.check() is True

    apply.assert_called_once_with(LOCAL)
    assert store.load() == SavedDirectories(
        directories=[], updated_at="2026-11-14T13:00:00.000Z", source="installation"
    )


def test_confirms_a_change_in_the_dashboard_even_with_the_same_folders(tmp_path):
    body = {
        "source": "client",
        "monitoredDirectories": [r"c:\users\ana\documents", r"C:\USERS\ANA\DESKTOP"],
        "updatedAt": "t2",
    }
    sync, http_client, apply, _store = create_sync(tmp_path, body=body, updated_at="t1")
    sync.reported = True

    assert sync.check() is False

    # Mesmas pastas (o Windows ignora maiúsculas): não troca, mas confirma.
    apply.assert_not_called()
    assert len(reported(http_client)) == 1


@pytest.mark.parametrize(
    "body",
    [
        [],
        {"monitoredDirectories": "C:\\Dados"},
        {"monitoredDirectories": [1, 2]},
        {"monitoredDirectories": ["C:\\" + "a" * 300]},
        {"monitoredDirectories": ["C:\\x"] * 51},
        {"source": "endpoint", "monitoredDirectories": [1]},
        {"source": "outra", "monitoredDirectories": []},
        {"monitoredDirectories": ["C:\\Dados"]},
    ],
)
def test_ignores_an_invalid_configuration(tmp_path, body, caplog):
    sync, http_client, apply, _store = create_sync(tmp_path, body=body)

    assert sync.check() is False

    apply.assert_not_called()
    http_client.post.assert_not_called()
    assert "Ignoring invalid directory configuration" in caplog.text


def test_old_server_without_the_route_is_logged_once(tmp_path, caplog):
    caplog.set_level("INFO")
    sync, http_client, apply, _store = create_sync(tmp_path)
    http_client.get.side_effect = http_error(404)

    assert sync.check() is False
    assert sync.check() is False

    assert caplog.text.count("does not support remote directory configuration") == 1
    apply.assert_not_called()


def test_other_http_errors_wait_for_the_next_cycle(tmp_path):
    sync, http_client, apply, _store = create_sync(tmp_path)
    http_client.get.side_effect = http_error(500)

    assert sync.check() is False
    apply.assert_not_called()
    http_client.post.assert_not_called()


def test_store_ignores_a_damaged_file(tmp_path):
    path = tmp_path / "remote-directories.json"
    store = RemoteDirectoriesStore(path)

    assert store.load() == SavedDirectories()

    path.write_text("{não é json", encoding="utf-8")
    assert store.load() == SavedDirectories()

    path.write_text(json.dumps({"directories": [{"x": 1}], "updatedAt": 5}), encoding="utf-8")
    assert store.load() == SavedDirectories()

    path.write_text(json.dumps(["C:\\Dados"]), encoding="utf-8")
    assert store.load() == SavedDirectories()


def test_store_saves_and_loads(tmp_path):
    store = RemoteDirectoriesStore(tmp_path / "sub" / "remote-directories.json")
    saved = SavedDirectories(directories=[r"D:\Dados"], updated_at="t1", source="client")

    store.save(saved)

    assert store.load() == saved
    assert store.load().from_dashboard is True


def test_store_treats_an_unknown_source_as_the_installation(tmp_path):
    path = tmp_path / "remote-directories.json"
    path.write_text(json.dumps({"source": "x", "directories": [r"D:\Dados"]}), encoding="utf-8")

    assert RemoteDirectoriesStore(path).load().from_dashboard is False
