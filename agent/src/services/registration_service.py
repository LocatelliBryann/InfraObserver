class RegistrationService:
    def __init__(
        self,
        http_client,
        agent_id: str,
        hostname: str,
        ip_address: str,
        os_name: str,
        os_version: str,
    ):
        self.http_client = http_client
        self.agent_id = agent_id
        self.hostname = hostname
        self.ip_address = ip_address
        self.os_name = os_name
        self.os_version = os_version

    def register(self):
        payload = {
            "agentId": self.agent_id,
            "hostname": self.hostname,
            "ipAddress": self.ip_address,
            "osName": self.os_name,
            "osVersion": self.os_version,
        }

        return self.http_client.post(
            "/api/v1/endpoints/register",
            payload,
        )