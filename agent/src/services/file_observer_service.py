from pathlib import Path


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

class FileObserverGroupService:
    def __init__(self, observers):
        self.observers = observers

    def start(self) -> None:
        for observer in self.observers:
            observer.start()

    def stop(self) -> None:
        for observer in self.observers:
            observer.stop()
            observer.join()