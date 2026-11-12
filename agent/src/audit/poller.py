import logging
import threading

from src.audit.actor_index import AuditIndex
from src.audit.events import parse_event, record_id_of

logger = logging.getLogger(__name__)

DEFAULT_POLL_SECONDS = 1.0
# Depois de um erro (log cheio, serviço de log reiniciando), espera mais.
ERROR_RETRY_SECONDS = 30.0


class AuditPoller:
    """Lê os eventos novos do log de Segurança e guarda no índice."""

    def __init__(
        self,
        event_log,
        index: AuditIndex,
        poll_seconds: float = DEFAULT_POLL_SECONDS,
    ):
        self.event_log = event_log
        self.index = index
        self.poll_seconds = poll_seconds
        self.last_record_id: int | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def poll_once(self) -> int:
        """Lê uma vez; devolve quantas ações foram guardadas."""
        if self.last_record_id is None:
            # Começa do momento atual: o histórico antigo não interessa.
            self.last_record_id = self.event_log.latest_record_id()
            return 0

        stored = 0

        for xml_text in self.event_log.read_after(self.last_record_id):
            # Avança mesmo nos eventos descartados, para não lê-los de novo.
            self.last_record_id = max(self.last_record_id, record_id_of(xml_text))
            record = parse_event(xml_text)

            if record is None:
                continue

            self.index.add(record)
            stored += 1

        return stored

    def _run(self) -> None:
        while not self._stop.is_set():
            wait = self.poll_seconds

            try:
                self.poll_once()
            except Exception:
                logger.exception("Failed to read the Windows Security log")
                wait = ERROR_RETRY_SECONDS

            self._stop.wait(wait)

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._run,
            name="audit-poller",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

        if self._thread is not None:
            self._thread.join(timeout=5)
