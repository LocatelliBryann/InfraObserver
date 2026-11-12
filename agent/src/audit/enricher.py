import logging
import queue
import threading
import time
from dataclasses import replace
from typing import Callable

from src.audit.actor_index import AuditActor, AuditIndex
from src.watchers.file_event import FileEvent, FileEventType

logger = logging.getLogger(__name__)

# O Windows grava o evento de auditoria quase junto com o aviso do watchdog,
# mas o agente lê o log a cada segundo: espera um pouco antes de enviar.
DEFAULT_DELAY_SECONDS = 3.0


def find_actor(index: AuditIndex, event: FileEvent) -> AuditActor | None:
    occurred_at = event.occurred_at

    if event.event_type == FileEventType.CREATE:
        # Arquivo novo: o Windows audita a permissão de criar na pasta pai.
        return index.lookup(event.file_path, occurred_at, include_parent=True)

    if event.event_type in (FileEventType.RENAME, FileEventType.MOVE):
        # Renomear e mover exigem apagar o nome antigo: a auditoria fica nele.
        return (
            index.lookup(event.previous_path or event.file_path, occurred_at)
            or index.lookup(event.file_path, occurred_at, include_parent=True)
        )

    return index.lookup(event.file_path, occurred_at)


def enrich(index: AuditIndex, event: FileEvent) -> FileEvent:
    actor = find_actor(index, event)

    if actor is None:
        return event

    return replace(
        event,
        username=actor.user,
        process_name=actor.process,
        source_ip=actor.source_ip,
        audited=True,
    )


class AuditEnricher:
    """Segura cada evento de arquivo alguns segundos, completa com a
    auditoria e entrega para envio, na mesma ordem em que chegaram."""

    def __init__(
        self,
        index: AuditIndex,
        send: Callable[[FileEvent], object],
        delay_seconds: float = DEFAULT_DELAY_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.index = index
        self.send = send
        self.delay_seconds = delay_seconds
        self.clock = clock
        self._queue: queue.Queue[tuple[float, FileEvent]] = queue.Queue()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def handle(self, event: FileEvent) -> None:
        """Chamado pela thread do watchdog: só enfileira."""
        self._queue.put((self.clock() + self.delay_seconds, event))

    def _deliver(self, event: FileEvent) -> None:
        try:
            self.send(enrich(self.index, event))
        except Exception:
            logger.exception("Failed to deliver file event for %s", event.file_path)

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                due, event = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue

            remaining = due - self.clock()

            if remaining > 0:
                self._stop.wait(remaining)

            self._deliver(event)

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._run,
            name="audit-enricher",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        """Entrega o que ainda estava esperando, sem esperar o atraso."""
        self._stop.set()

        if self._thread is not None:
            self._thread.join(timeout=5)

        self.flush()

    def flush(self) -> None:
        while True:
            try:
                _, event = self._queue.get_nowait()
            except queue.Empty:
                return

            self._deliver(event)
