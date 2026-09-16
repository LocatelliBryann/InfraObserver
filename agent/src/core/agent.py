class Agent:
    def __init__(self, registration_service):
        self.registration_service = registration_service

    def start(self):
        self.registration_service.register()