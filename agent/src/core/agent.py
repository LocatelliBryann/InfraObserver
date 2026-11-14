import logging
import time

logger = logging.getLogger(__name__)


class Agent:
    def __init__(
        self,
        registration_service,
        metrics_service,
        settings,
        file_observer_service=None,
        update_service=None,
        outbox_sender=None,
        audit_service=None,
        directory_sync=None,
    ):
        self.registration_service = registration_service
        self.metrics_service = metrics_service
        self.settings = settings
        self.file_observer_service = file_observer_service
        self.update_service = update_service
        self.outbox_sender = outbox_sender
        self.audit_service = audit_service
        # RF10: pastas definidas pelo dashboard.
        self.directory_sync = directory_sync

    def start(self):
        # A auditoria começa antes das pastas, para não perder os primeiros eventos.
        if self.audit_service is not None:
            self.audit_service.start()

        # Com a fila, as pastas são observadas desde já, mesmo que o servidor
        # esteja fora do ar: os eventos esperam na fila até o registro.
        if self.outbox_sender is not None and self.file_observer_service is not None:
            self.file_observer_service.start()
            self.register_with_retry()
        else:
            self.register_with_retry()

            if self.file_observer_service is not None:
                self.file_observer_service.start()

        if self.outbox_sender is not None:
            self.outbox_sender.start()

        try:
            self.run()
        finally:
            self.stop()

    def stop(self):
        if self.file_observer_service is not None:
            self.file_observer_service.stop()

        # Depois das pastas: entrega os eventos que ainda esperavam a auditoria.
        if self.audit_service is not None:
            self.audit_service.stop()

        if self.outbox_sender is not None:
            self.outbox_sender.stop()

    def register_with_retry(self):
        while True:
            try:
                return self.registration_service.register()
            except Exception:
                logger.exception(
                    "Failed to register endpoint, retrying in %s seconds",
                    self.settings.collection_interval,
                )
                time.sleep(self.settings.collection_interval)

    def collect_metrics(self):
        return self.metrics_service.collect_and_send()

    def run_cycle(self) -> bool:
        try:
            self.collect_metrics()
        except Exception:
            logger.exception("Failed to collect or send metrics")
            return False

        if self.directory_sync is not None:
            try:
                self.directory_sync.check()
            except Exception:
                logger.exception("Failed to sync monitored directories")

        if self.update_service is not None:
            self.update_service.check_if_due()

        return True

    def run(self):
        while True:
            self.run_cycle()
            time.sleep(self.settings.collection_interval)
