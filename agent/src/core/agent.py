import time


class Agent:
    def __init__(
        self,
        registration_service,
        metrics_service,
        settings,
        file_observer_service=None,
    ):
        self.registration_service = registration_service
        self.metrics_service = metrics_service
        self.settings = settings
        self.file_observer_service = file_observer_service

    def start(self):
        self.registration_service.register()

        if self.file_observer_service is not None:
            self.file_observer_service.start()

        self.run()

    def stop(self):
        if self.file_observer_service is not None:
            self.file_observer_service.stop()

    def collect_metrics(self):
        return self.metrics_service.collect_and_send()

    def run(self):
        while True:
            self.collect_metrics()
            time.sleep(self.settings.collection_interval)