import time


class Agent:
    def __init__(self, registration_service, metrics_service, settings):
        self.registration_service = registration_service
        self.metrics_service = metrics_service
        self.settings = settings

    def start(self):
        self.registration_service.register()
        self.run()

    def collect_metrics(self):
        return self.metrics_service.collect_and_send()

    def run(self):
        while True:
            self.collect_metrics()
            time.sleep(self.settings.collection_interval)