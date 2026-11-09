"""Atualização automática do agente instalado no Windows.

A cada poucas horas o agente pergunta à API qual versão deve estar instalada
(``GET /api/v1/agent/update``). Se for mais nova que a dele, baixa o instalador,
confere o SHA-256 e roda o instalador em modo silencioso. O instalador para o
serviço, troca os arquivos, mantém a configuração e inicia a versão nova.
"""

import hashlib
import logging
import os
import re
import subprocess
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

UPDATE_PATH = "/api/v1/agent/update"
MAX_INSTALLER_BYTES = 300 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

_VERSION_PATTERN = re.compile(r"(\d+)\.(\d+)\.(\d+)(?:[-+](.+))?")
_SHA256_PATTERN = re.compile(r"[a-f0-9]{64}")

# Flags do Windows para iniciar um processo sem janela.
_CREATE_NO_WINDOW = 0x08000000


@dataclass(frozen=True)
class AvailableRelease:
    version: str
    url: str
    sha256: str


def version_key(version: str) -> tuple[int, int, int, int]:
    """Chave para comparar versões: 1.5.0-dev.3 < 1.5.0 < 1.5.1."""
    match = _VERSION_PATTERN.fullmatch(version.strip())

    if match is None:
        raise ValueError(f"Invalid version: {version}")

    major, minor, patch, prerelease = match.groups()
    return int(major), int(minor), int(patch), 0 if prerelease else 1


def is_newer(candidate: str, current: str) -> bool:
    try:
        current_key = version_key(current)
    except ValueError:
        # Versão local desconhecida: qualquer release válida é mais nova.
        current_key = (-1, -1, -1, -1)

    return version_key(candidate) > current_key


def parse_release(data: dict) -> AvailableRelease:
    version = str(data.get("version", ""))
    url = str(data.get("url", ""))
    sha256 = str(data.get("sha256", "")).lower()

    version_key(version)

    if not url.startswith("https://"):
        raise ValueError("Installer URL must use HTTPS")

    if not _SHA256_PATTERN.fullmatch(sha256):
        raise ValueError("Invalid installer SHA-256")

    return AvailableRelease(version=version, url=url, sha256=sha256)


def download_installer(release: AvailableRelease, directory: Path) -> Path:
    """Baixa o instalador e só o mantém se o SHA-256 conferir."""
    directory.mkdir(parents=True, exist_ok=True)

    for old_file in directory.glob("InfraObserverAgentSetup-*"):
        old_file.unlink(missing_ok=True)

    target = directory / f"InfraObserverAgentSetup-{release.version}.exe"
    partial = target.with_name(target.name + ".part")
    digest = hashlib.sha256()
    size = 0

    with requests.get(release.url, stream=True, timeout=(10, 120)) as response:
        response.raise_for_status()

        with partial.open("wb") as output:
            for chunk in response.iter_content(CHUNK_SIZE):
                size += len(chunk)

                if size > MAX_INSTALLER_BYTES:
                    raise ValueError("Installer is larger than expected")

                digest.update(chunk)
                output.write(chunk)

    if digest.hexdigest() != release.sha256:
        partial.unlink(missing_ok=True)
        raise ValueError("Installer SHA-256 does not match, update discarded")

    partial.replace(target)
    return target


def launch_installer(installer: Path, log_file: Path) -> None:
    """Roda o instalador sem janela, desvinculado do agente.

    O ``cmd /c start`` faz o instalador não ser processo filho do agente: ao
    parar o serviço, o WinSW encerra os filhos do agente, e é o próprio
    instalador que para o serviço para trocar os arquivos.
    """
    # Caminho completo do cmd.exe, e argumentos montados pelo próprio agente:
    # nada do comando vem da rede (a versão já foi validada e o SHA-256 conferido).
    cmd = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "cmd.exe")

    subprocess.Popen(
        [
            cmd,
            "/c",
            "start",
            "",
            str(installer),
            "/VERYSILENT",
            "/SUPPRESSMSGBOXES",
            "/NORESTART",
            f"/LOG={log_file}",
        ],
        creationflags=_CREATE_NO_WINDOW,
        close_fds=True,
    )


class UpdateService:
    def __init__(
        self,
        http_client,
        current_version: str,
        download_directory: Path,
        interval_seconds: float,
        downloader: Callable[[AvailableRelease, Path], Path] = download_installer,
        launcher: Callable[[Path, Path], None] = launch_installer,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.http_client = http_client
        self.current_version = current_version
        self.download_directory = download_directory
        self.interval_seconds = interval_seconds
        self.downloader = downloader
        self.launcher = launcher
        self.clock = clock
        self.last_check: float | None = None
        self.update_started = False

    def check_if_due(self) -> bool:
        """Chamado a cada ciclo do agente; consulta a API só quando é hora."""
        if self.update_started:
            return False

        now = self.clock()

        if self.last_check is not None and now - self.last_check < self.interval_seconds:
            return False

        self.last_check = now

        try:
            return self.check()
        except Exception as error:
            logger.warning("Agent update check failed: %s", error)
            return False

    def check(self) -> bool:
        response = self.http_client.get(UPDATE_PATH)

        if response.status_code == 204:
            return False

        release = parse_release(response.json())

        if not is_newer(release.version, self.current_version):
            return False

        logger.info(
            "Updating agent from %s to %s",
            self.current_version,
            release.version,
        )
        installer = self.downloader(release, self.download_directory)
        self.launcher(installer, self.download_directory / "install.log")
        self.update_started = True
        logger.info("Installer started: %s", installer.name)
        return True
