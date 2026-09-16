from src.collectors.system_info import SystemInfoCollector
from src.config.settings import AgentSettings


class RegistrationService:
    def __init__(
        self,
        http_client,
        settings: AgentSettings,
        system_info_collector: SystemInfoCollector,
    ):
        self.http_client = http_client
        self.settings = settings
        self.system_info_collector = system_info_collector

    def register(self):
        system_info = self.system_info_collector.collect()

        payload = {
            "agentId": str(self.settings.agent_id),
            "hostname": system_info.hostname,
            "ipAddress": system_info.ip_address,
            "osName": system_info.os_name,
            "osVersion": system_info.os_version,
        }

        return self.http_client.post(
            "/api/v1/endpoints/register",
            payload,
        )