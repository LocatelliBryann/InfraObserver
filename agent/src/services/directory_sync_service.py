"""RF10: pastas monitoradas definidas pelo dashboard.

A cada ciclo, o agente pergunta ao servidor quais pastas monitorar. Se a lista
mudou, troca os observadores (e a auditoria do Windows) e informa o que
conseguiu aplicar.

O servidor diz de onde vem a lista:
- "endpoint": lista própria deste PC;
- "client": lista do cliente, para todos os PCs dele;
- "installation": as pastas da instalação (agent.env ou as do usuário).
Com "endpoint" ou "client", uma lista vazia quer dizer nenhuma pasta: o PC só
envia métricas.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import requests

logger = logging.getLogger(__name__)

STORE_FILE_NAME = "remote-directories.json"
INSTALLATION = "installation"
SOURCES = ("endpoint", "client", INSTALLATION)
# Mesmos limites do servidor.
MAX_DIRECTORIES = 50
MAX_PATH_LENGTH = 260

# Recebe as pastas pedidas; devolve (monitoradas, não encontradas).
ApplyDirectories = Callable[[list[str]], tuple[list[str], list[str]]]


def _valid_directories(value) -> list[str] | None:
    """Só uma lista de textos de tamanho razoável vira pasta monitorada."""
    if not isinstance(value, list) or len(value) > MAX_DIRECTORIES:
        return None

    if not all(
        isinstance(item, str) and 0 < len(item) <= MAX_PATH_LENGTH for item in value
    ):
        return None

    return list(value)


def _same_directories(first: list[str], second: list[str]) -> bool:
    # O Windows não diferencia maiúsculas de minúsculas nos caminhos.
    def normalize(items):
        return [item.lower() for item in items]

    return normalize(first) == normalize(second)


@dataclass
class SavedDirectories:
    directories: list[str] = field(default_factory=list)
    updated_at: str | None = None
    source: str = INSTALLATION

    @property
    def from_dashboard(self) -> bool:
        return self.source != INSTALLATION


class RemoteDirectoriesStore:
    """Guarda a última lista do dashboard, para o agente continuar com ela
    depois de reiniciar, mesmo sem conseguir falar com o servidor."""

    def __init__(self, path: Path):
        self.path = path

    def load(self) -> SavedDirectories:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return SavedDirectories()

        if not isinstance(data, dict):
            return SavedDirectories()

        directories = _valid_directories(data.get("directories")) or []
        updated_at = data.get("updatedAt")
        source = data.get("source")

        return SavedDirectories(
            directories=directories,
            updated_at=updated_at if isinstance(updated_at, str) else None,
            source=source if source in SOURCES else INSTALLATION,
        )

    def save(self, saved: SavedDirectories) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_name(self.path.name + ".tmp")
        temporary.write_text(
            json.dumps(
                {
                    "source": saved.source,
                    "directories": saved.directories,
                    "updatedAt": saved.updated_at,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        os.replace(temporary, self.path)


class DirectorySyncService:
    def __init__(
        self,
        http_client,
        agent_id,
        local_directories: list[str],
        apply: ApplyDirectories,
        store: RemoteDirectoriesStore,
        current: list[str],
        current_updated_at: str | None = None,
        initial_result: tuple[list[str], list[str]] = ([], []),
    ):
        self.http_client = http_client
        self.agent_id = str(agent_id)
        self.local_directories = local_directories
        self.apply = apply
        self.store = store
        # Pastas pedidas hoje (as monitoradas mais as que não existem).
        self.current = current
        self.current_updated_at = current_updated_at
        self.monitored, self.missing = initial_result
        # Na primeira consulta o agente sempre informa o que está monitorando.
        self.reported = False
        self.supported = True

    @property
    def config_path(self) -> str:
        return f"/api/v1/agents/{self.agent_id}/config"

    def fetch(self) -> SavedDirectories | None:
        try:
            response = self.http_client.get(self.config_path)
        except requests.HTTPError as error:
            status = getattr(error.response, "status_code", None)

            if status == 404 and self.supported:
                # Servidor anterior ao RF10: segue com as pastas da instalação.
                logger.info("Server does not support remote directory configuration")
                self.supported = False

            return None

        self.supported = True
        body = response.json()

        if not isinstance(body, dict):
            logger.warning("Ignoring invalid directory configuration from the server")
            return None

        directories = _valid_directories(body.get("monitoredDirectories"))

        if directories is None:
            logger.warning("Ignoring invalid directory configuration from the server")
            return None

        updated_at = body.get("updatedAt")
        source = body.get("source")

        if source not in SOURCES:
            logger.warning("Ignoring invalid directory configuration from the server")
            return None

        return SavedDirectories(
            directories=directories if source != INSTALLATION else [],
            updated_at=updated_at if isinstance(updated_at, str) else None,
            source=source,
        )

    def report(self) -> None:
        self.http_client.post(
            f"{self.config_path}/status",
            {
                "monitoredDirectories": self.monitored[:MAX_DIRECTORIES],
                "missingDirectories": self.missing[:MAX_DIRECTORIES],
            },
        )
        self.reported = True

    def check(self) -> bool:
        """Confere a configuração; devolve True se trocou as pastas."""
        config = self.fetch()

        if config is None:
            return False

        desired = config.directories if config.from_dashboard else self.local_directories
        changed = not _same_directories(desired, self.current)

        if changed:
            if config.from_dashboard:
                logger.info(
                    "Applying %s monitored folder(s) from the dashboard (%s)",
                    len(desired),
                    config.source,
                )
            else:
                logger.info(
                    "Going back to the %s folder(s) from the installation",
                    len(desired),
                )
            self.monitored, self.missing = self.apply(desired)
            self.current = desired

        if changed or config.updated_at != self.current_updated_at:
            self.store.save(config)
            self.current_updated_at = config.updated_at
            self.reported = False

        # Informa na primeira vez e a cada mudança no dashboard, mesmo que a
        # lista seja igual: é a confirmação de que o agente recebeu.
        if not self.reported:
            self.report()

        return changed
