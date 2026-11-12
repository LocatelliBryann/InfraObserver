import logging
import threading
from typing import Callable

from src.audit.enricher import AuditEnricher
from src.audit.poller import AuditPoller
from src.watchers.file_event import FileEvent

logger = logging.getLogger(__name__)


class WindowsAuditService:
    """Junta as peças da auditoria: liga a política e as regras nas pastas,
    lê o log de Segurança e completa os eventos de arquivo.

    Se algo falhar (sem permissão, log desligado), os eventos continuam
    saindo como antes, com o usuário da sessão aberta.
    """

    def __init__(
        self,
        configurator,
        poller: AuditPoller,
        enricher: AuditEnricher,
        directories: list[str],
    ):
        self.configurator = configurator
        self.poller = poller
        self.enricher = enricher
        self.directories = directories
        self._setup_thread: threading.Thread | None = None

    @property
    def handle(self) -> Callable[[FileEvent], None]:
        return self.enricher.handle

    def _setup(self) -> None:
        logger.info(
            "Enabling Windows file auditing on %s folder(s)",
            len(self.directories),
        )

        try:
            audited = self.configurator.enable(self.directories)
            logger.info("Windows file auditing enabled on %s folder(s)", len(audited))
        except Exception:
            logger.exception(
                "Could not enable Windows file auditing; "
                "file events will use the logged-in user"
            )

    def start(self) -> None:
        # Os eventos passam pelo enricher desde já; sem auditoria, ele só
        # atrasa um pouco e envia como antes.
        self.enricher.start()

        try:
            self.poller.start()
        except Exception:
            logger.exception("Could not read the Windows Security log")

        # Aplicar as regras em pastas grandes pode demorar: em segundo plano.
        self._setup_thread = threading.Thread(
            target=self._setup,
            name="audit-setup",
            daemon=True,
        )
        self._setup_thread.start()

    def stop(self) -> None:
        self.poller.stop()
        self.enricher.stop()
