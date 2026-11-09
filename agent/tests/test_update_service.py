import hashlib
import logging
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from src.services.update_service import (
    AvailableRelease,
    UpdateService,
    download_installer,
    is_newer,
    launch_installer,
    parse_release,
    version_key,
)

CONTENT = b"installer-bytes"
SHA = hashlib.sha256(CONTENT).hexdigest()
URL = "https://github.com/LocatelliBryann/InfraObserver/releases/download/v1.5.0/InfraObserverAgentSetup-1.5.0.exe"
RELEASE_JSON = {"version": "1.5.0", "url": URL, "sha256": SHA}


def response(status_code=200, data=None):
    result = Mock()
    result.status_code = status_code
    result.json.return_value = data
    return result


def make_service(tmp_path, current="1.4.0", get_response=None, clock_values=None):
    http_client = Mock()
    http_client.get.return_value = get_response or response(200, RELEASE_JSON)
    downloader = Mock(return_value=tmp_path / "updates" / "InfraObserverAgentSetup-1.5.0.exe")
    launcher = Mock()
    clock = Mock(side_effect=clock_values or [0.0])
    service = UpdateService(
        http_client=http_client,
        current_version=current,
        download_directory=tmp_path / "updates",
        interval_seconds=6 * 3600,
        downloader=downloader,
        launcher=launcher,
        clock=clock,
    )
    return service, http_client, downloader, launcher


@pytest.mark.parametrize(
    ("candidate", "current", "expected"),
    [
        ("1.5.0", "1.4.0", True),
        ("1.5.0", "0.0.0-dev.3", True),
        ("1.5.0", "1.5.0-dev.1", True),
        ("1.10.0", "1.9.9", True),
        ("1.5.0", "1.5.0", False),
        ("1.4.2", "1.5.0", False),
        ("1.5.0", "not-a-version", True),
    ],
)
def test_is_newer_compares_versions(candidate, current, expected):
    assert is_newer(candidate, current) is expected


def test_version_key_rejects_invalid_versions():
    with pytest.raises(ValueError):
        version_key("latest")


def test_parse_release_validates_the_api_answer():
    assert parse_release(RELEASE_JSON) == AvailableRelease("1.5.0", URL, SHA)

    with pytest.raises(ValueError, match="HTTPS"):
        parse_release({**RELEASE_JSON, "url": "http://example.com/setup.exe"})

    with pytest.raises(ValueError, match="SHA-256"):
        parse_release({**RELEASE_JSON, "sha256": "abc"})

    with pytest.raises(ValueError):
        parse_release({**RELEASE_JSON, "version": "x"})


def test_installs_a_newer_version(tmp_path, caplog):
    service, http_client, downloader, launcher = make_service(tmp_path)

    with caplog.at_level(logging.INFO):
        assert service.check_if_due() is True

    http_client.get.assert_called_once_with("/api/v1/agent/update")
    downloader.assert_called_once_with(AvailableRelease("1.5.0", URL, SHA), tmp_path / "updates")
    launcher.assert_called_once_with(
        downloader.return_value,
        tmp_path / "updates" / "install.log",
    )
    assert "Updating agent from 1.4.0 to 1.5.0" in caplog.text


def test_does_nothing_when_already_up_to_date(tmp_path):
    service, _, downloader, launcher = make_service(tmp_path, current="1.5.0")

    assert service.check_if_due() is False
    downloader.assert_not_called()
    launcher.assert_not_called()


def test_does_nothing_when_server_has_no_update(tmp_path):
    service, _, downloader, _ = make_service(tmp_path, get_response=response(204))

    assert service.check_if_due() is False
    downloader.assert_not_called()


def test_checks_again_only_after_the_interval(tmp_path):
    service, http_client, _, _ = make_service(
        tmp_path,
        current="1.5.0",
        clock_values=[0.0, 60.0, 6 * 3600 + 1.0],
    )

    service.check_if_due()
    service.check_if_due()
    service.check_if_due()

    assert http_client.get.call_count == 2


def test_stops_checking_once_the_installer_started(tmp_path):
    service, http_client, _, launcher = make_service(
        tmp_path,
        clock_values=[0.0, 7 * 3600.0],
    )

    service.check_if_due()
    assert service.check_if_due() is False

    assert http_client.get.call_count == 1
    launcher.assert_called_once()


def test_failures_are_logged_and_do_not_stop_the_agent(tmp_path, caplog):
    service, http_client, _, _ = make_service(tmp_path)
    http_client.get.side_effect = ConnectionError("offline")

    assert service.check_if_due() is False
    assert "Agent update check failed: offline" in caplog.text


class FakeDownload:
    def __init__(self, chunks, status_error=None):
        self.chunks = chunks
        self.status_error = status_error

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def raise_for_status(self):
        if self.status_error:
            raise self.status_error

    def iter_content(self, _size):
        return iter(self.chunks)


def test_download_keeps_the_installer_when_the_hash_matches(tmp_path):
    directory = tmp_path / "updates"
    directory.mkdir()
    (directory / "InfraObserverAgentSetup-1.4.0.exe").write_bytes(b"old")
    release = AvailableRelease("1.5.0", URL, SHA)

    with patch("src.services.update_service.requests.get", return_value=FakeDownload([b"installer-", b"bytes"])) as get:
        installer = download_installer(release, directory)

    get.assert_called_once_with(URL, stream=True, timeout=(10, 120))
    assert installer == directory / "InfraObserverAgentSetup-1.5.0.exe"
    assert installer.read_bytes() == CONTENT
    assert not (directory / "InfraObserverAgentSetup-1.4.0.exe").exists()


def test_download_discards_a_file_with_the_wrong_hash(tmp_path):
    release = AvailableRelease("1.5.0", URL, "0" * 64)

    with patch("src.services.update_service.requests.get", return_value=FakeDownload([b"tampered"])):
        with pytest.raises(ValueError, match="does not match"):
            download_installer(release, tmp_path)

    assert list(tmp_path.iterdir()) == []


def test_download_refuses_files_that_are_too_large(tmp_path):
    release = AvailableRelease("1.5.0", URL, SHA)

    with (
        patch("src.services.update_service.MAX_INSTALLER_BYTES", 4),
        patch("src.services.update_service.requests.get", return_value=FakeDownload([b"12345"])),
    ):
        with pytest.raises(ValueError, match="larger"):
            download_installer(release, tmp_path)


def test_launch_runs_the_installer_silently_outside_the_service(tmp_path):
    installer = tmp_path / "InfraObserverAgentSetup-1.5.0.exe"
    log_file = tmp_path / "install.log"

    with (
        patch.dict("os.environ", {"SystemRoot": "C:/Windows"}),
        patch("src.services.update_service.subprocess.Popen") as popen,
    ):
        launch_installer(installer, log_file)

    args = popen.call_args.args[0]
    assert args[0].replace("\\", "/") == "C:/Windows/System32/cmd.exe"
    assert args[1:4] == ["/c", "start", ""]
    assert args[4] == str(installer)
    assert "/VERYSILENT" in args
    assert f"/LOG={log_file}" in args
    assert popen.call_args.kwargs["creationflags"] == 0x08000000
