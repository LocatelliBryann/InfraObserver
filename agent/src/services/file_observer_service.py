import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class FileObserverService:
    def __init__(
        self,
        observer,
        directory: str,
        event_handler=None,
    ):
        self.observer = observer
        self.directory = Path(directory)
        self.event_handler = event_handler

    def start(self) -> None:
        self.observer.schedule(
            event_handler=self.event_handler,
            path=str(self.directory),
            recursive=True,
        )
        self.observer.start()

    def stop(self) -> None:
        self.observer.stop()
        self.observer.join()

def _watched_paths(observer) -> str:
    try:
        return ", ".join(str(emitter.watch.path) for emitter in observer.emitters)
    except Exception:
        return "unknown directory"


class FileObserverGroupService:
    """Um observador por pasta. Se uma pasta não puder ser observada (sem
    permissão, unidade de rede fora do ar), as outras continuam e o agente
    segue enviando métricas."""

    def __init__(self, observers):
        self.observers = observers
        self.started = []

    def start(self) -> None:
        for observer in self.observers:
            paths = _watched_paths(observer)

            try:
                observer.start()
            except Exception as error:
                logger.warning("Could not monitor %s: %s", paths, error)
                continue

            self.started.append(observer)

        if self.observers and not self.started:
            logger.error("No directory could be monitored")

    def stop(self) -> None:
        for observer in self.started:
            observer.stop()
            observer.join()

        self.started = []
