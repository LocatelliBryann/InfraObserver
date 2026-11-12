import threading
import time
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Callable

from src.audit.events import (
    CHANGE_MASK,
    EVENT_OBJECT_ACCESS,
    EVENT_OBJECT_DELETED,
    EVENT_SHARE_ACCESS,
    AuditRecord,
)

# Quanto tempo uma ação auditada fica guardada esperando o evento do watchdog.
DEFAULT_TTL_SECONDS = 120.0
# Diferença máxima entre o horário da auditoria e o do evento de arquivo.
MATCH_WINDOW = timedelta(seconds=30)
# Limite de caminhos guardados, para a memória não crescer.
MAX_ENTRIES = 5000
# Handles abertos esperando o 4660 (exclusão confirmada).
MAX_HANDLES = 2000


@dataclass(frozen=True)
class AuditActor:
    """Quem fez a ação: usuário, programa e, pela rede, o IP de origem."""

    user: str
    process: str | None
    source_ip: str | None
    occurred_at: datetime


def normalize_path(path: str) -> str:
    """Caminho comparável: barras do Windows, sem barra no fim, sem caixa."""
    return path.replace("/", "\\").rstrip("\\").casefold()


def parent_path(path: str) -> str:
    normalized = normalize_path(path)
    head, separator, _ = normalized.rpartition("\\")

    return head if separator else normalized


def display_user(user: str, domain: str | None, computer_name: str | None) -> str:
    """Conta local aparece só com o nome; conta de domínio, DOMINIO\\usuario."""
    if not domain or (computer_name and domain.casefold() == computer_name.casefold()):
        return user

    return f"{domain}\\{user}"


def process_name(process: str | None) -> str | None:
    if not process:
        return None

    return process.replace("/", "\\").rsplit("\\", 1)[-1] or None


class AuditIndex:
    """Últimas ações auditadas por caminho, para completar os eventos."""

    def __init__(
        self,
        computer_name: str | None = None,
        ttl_seconds: float = DEFAULT_TTL_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.computer_name = computer_name
        self.ttl_seconds = ttl_seconds
        self.clock = clock
        self._lock = threading.Lock()
        self._actors: dict[str, tuple[float, AuditActor]] = {}
        self._handles: dict[str, str] = {}

    def add(self, record: AuditRecord) -> None:
        if record.user is None:
            return

        with self._lock:
            if record.event_id == EVENT_OBJECT_DELETED:
                # O 4660 confirma a exclusão do caminho aberto pelo 4663.
                path = self._handles.pop(record.handle_id or "", None)
                if path is not None:
                    self._touch(path)
                return

            if record.path is None:
                return

            if record.event_id == EVENT_OBJECT_ACCESS:
                if not record.access_mask & CHANGE_MASK:
                    return

                if record.handle_id:
                    if len(self._handles) >= MAX_HANDLES:
                        self._handles.clear()
                    self._handles[record.handle_id] = normalize_path(record.path)

            self._store(record)

    def _store(self, record: AuditRecord) -> None:
        key = normalize_path(record.path or "")
        now = self.clock()
        previous = self._actors.get(key)

        if len(self._actors) >= MAX_ENTRIES:
            self._prune(now)

        actor = AuditActor(
            user=display_user(record.user or "", record.domain, self.computer_name),
            process=process_name(record.process),
            source_ip=record.source_ip,
            occurred_at=record.occurred_at,
        )

        if previous is not None and now - previous[0] <= self.ttl_seconds:
            old = previous[1]
            if record.event_id == EVENT_SHARE_ACCESS:
                # O 5145 só acrescenta o IP; usuário e programa vêm do 4663.
                actor = replace(old, source_ip=actor.source_ip or old.source_ip)
            else:
                actor = replace(actor, source_ip=actor.source_ip or old.source_ip)

        self._actors[key] = (now, actor)

    def _touch(self, key: str) -> None:
        entry = self._actors.get(key)
        if entry is not None:
            self._actors[key] = (self.clock(), entry[1])

    def _prune(self, now: float) -> None:
        expired = [
            key
            for key, (stored_at, _) in self._actors.items()
            if now - stored_at > self.ttl_seconds
        ]

        for key in expired:
            del self._actors[key]

        if len(self._actors) >= MAX_ENTRIES:
            self._actors.clear()

    def lookup(
        self,
        path: str,
        occurred_at: datetime,
        include_parent: bool = False,
    ) -> AuditActor | None:
        """Ação auditada no caminho.

        Para arquivos novos, o Windows audita a pasta pai (permissão de criar
        arquivo nela), então include_parent também procura lá.
        """
        keys = [normalize_path(path)]

        if include_parent:
            keys.append(parent_path(path))

        with self._lock:
            now = self.clock()

            for key in keys:
                entry = self._actors.get(key)

                if entry is None or now - entry[0] > self.ttl_seconds:
                    continue

                actor = entry[1]

                if abs(actor.occurred_at - occurred_at) <= MATCH_WINDOW:
                    return actor

        return None
