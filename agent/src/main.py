from src.collectors.system_info import SystemInfoCollector
from src.config.settings import AgentSettings
from src.core.agent import Agent
from src.services.http_client import HttpClient
from src.services.registration_service import RegistrationService


def create_agent() -> Agent:
    settings = AgentSettings.from_environment()

    http_client = HttpClient(
        server_url=settings.server_url,
        agent_token=settings.agent_token,
    )

    system_info_collector = SystemInfoCollector()

    registration_service = RegistrationService(
        http_client=http_client,
        settings=settings,
        system_info_collector=system_info_collector,
    )

    return Agent(
        registration_service=registration_service,
    )


def main() -> None:
    agent = create_agent()
    agent.start()


if __name__ == "__main__":
    main()