import os
from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class AgentSettings:
    server_url: str
    agent_token: str
    agent_id: UUID
    collection_interval: int = 60
    monitored_directories: list[str] = field(default_factory=list)

    @classmethod
    def from_environment(cls) -> "AgentSettings":
        server_url = os.getenv("INFRAOBSERVER_SERVER_URL")
        agent_token = os.getenv("INFRAOBSERVER_AGENT_TOKEN")
        agent_id = os.getenv("INFRAOBSERVER_AGENT_ID")

        if not server_url:
            raise ValueError("INFRAOBSERVER_SERVER_URL is not configured")

        if not agent_token:
            raise ValueError("INFRAOBSERVER_AGENT_TOKEN is not configured")

        if not agent_id:
            raise ValueError("INFRAOBSERVER_AGENT_ID is not configured")

        directories_value = os.getenv(
            "INFRAOBSERVER_MONITORED_DIRECTORIES",
            "",
        )

        monitored_directories = [
            directory.strip()
            for directory in directories_value.split(",")
            if directory.strip()
        ]

        return cls(
            server_url=server_url,
            agent_token=agent_token,
            agent_id=UUID(agent_id),
            monitored_directories=monitored_directories,
        )