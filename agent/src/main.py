
import logging
import os

from dotenv import load_dotenv

# Carrega as variáveis de agent/.env antes de inicializar o agente.
load_dotenv()

from src.collectors.cpu import CpuCollector
from src.collectors.disk import DiskCollector
from src.collectors.memory import MemoryCollector
from src.collectors.metrics import MetricsCollector
from src.collectors.network import NetworkCollector
from src.collectors.system_info import SystemInfoCollector
from src.config.settings import AgentSettings
from src.core.agent import Agent
from src.services.http_client import HttpClient
from src.services.metrics_service import MetricsService
from src.services.registration_service import RegistrationService
from src.watchers.file_observer_factory import create_file_observer
from src.services.file_event_service import FileEventService
from src.services.file_observer_service import FileObserverGroupService
from src.watchers.default_directories import default_monitored_directories
from src.watchers.file_filter import FileEventFilter

logger = logging.getLogger(__name__)


def resolve_monitored_directories(settings: AgentSettings) -> list[str]:
    """Pastas configuradas ou, se nenhuma, as pastas padrão do usuário.

    Pastas que não existem (ou unidades de rede indisponíveis) são puladas com
    um aviso, para o agente não parar por causa de uma delas.
    """
    configured = settings.monitored_directories or default_monitored_directories()
    directories = []

    for directory in configured:
        if os.path.isdir(directory):
            directories.append(directory)
        else:
            logger.warning("Monitored directory not found: %s", directory)

    return directories


def create_file_observers(
    settings: AgentSettings,
    event_handler,
):
    event_filter = FileEventFilter(extra_patterns=settings.ignored_patterns)
    observers = []

    for directory in resolve_monitored_directories(settings):
        observer = create_file_observer(
            directory=directory,
            event_handler=event_handler,
            event_filter=event_filter,
        )
        observers.append(observer)
        logger.info("Monitoring directory: %s", directory)

    return observers


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

    cpu_collector = CpuCollector()
    memory_collector = MemoryCollector()
    disk_collector = DiskCollector()
    network_collector = NetworkCollector()

    metrics_collector = MetricsCollector(
        cpu_collector=cpu_collector,
        memory_collector=memory_collector,
        disk_collector=disk_collector,
        network_collector=network_collector,
    )

    metrics_service = MetricsService(
        http_client=http_client,
        settings=settings,
        metrics_collector=metrics_collector,
    )

    file_event_service = FileEventService(
        http_client=http_client,
        settings=settings,
    )

    file_observers = create_file_observers(
        settings=settings,
        event_handler=file_event_service.send,
    )

    file_observer_service = FileObserverGroupService(
        observers=file_observers,
    )

    return Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
        file_observer_service=file_observer_service,
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    agent = create_agent()
    agent.start()


if __name__ == "__main__":
    main()
