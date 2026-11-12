import os
from dataclasses import dataclass, field
from uuid import UUID

DEFAULT_COLLECTION_INTERVAL = 60
DEFAULT_UPDATE_INTERVAL_HOURS = 6


def _parse_list(value: str | None) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _parse_collection_interval(value: str | None) -> int:
    if value is None or not value.strip():
        return DEFAULT_COLLECTION_INTERVAL

    try:
        interval = int(value.strip())
    except ValueError as error:
        raise ValueError(
            "INFRAOBSERVER_COLLECTION_INTERVAL must be a positive integer"
        ) from error

    if interval <= 0:
        raise ValueError(
            "INFRAOBSERVER_COLLECTION_INTERVAL must be a positive integer"
        )

    return interval


def _parse_update_interval(value: str | None) -> float:
    if value is None or not value.strip():
        return DEFAULT_UPDATE_INTERVAL_HOURS

    try:
        hours = float(value.strip())
    except ValueError as error:
        raise ValueError(
            "INFRAOBSERVER_UPDATE_INTERVAL_HOURS must be a number (0 disables updates)"
        ) from error

    if hours < 0:
        raise ValueError(
            "INFRAOBSERVER_UPDATE_INTERVAL_HOURS must be a number (0 disables updates)"
        )

    return hours


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None or not value.strip():
        return default

    normalized = value.strip().lower()

    if normalized in ("1", "true", "yes", "sim", "on"):
        return True

    if normalized in ("0", "false", "no", "nao", "não", "off"):
        return False

    raise ValueError("INFRAOBSERVER_WINDOWS_AUDIT must be true or false")


@dataclass(frozen=True)
class AgentSettings:
    server_url: str
    agent_token: str
    agent_id: UUID
    collection_interval: int = DEFAULT_COLLECTION_INTERVAL
    # Vazio = pastas padrão do usuário (ver watchers/default_directories.py).
    monitored_directories: list[str] = field(default_factory=list)
    # Padrões extras de arquivos a ignorar, além dos temporários conhecidos.
    ignored_patterns: list[str] = field(default_factory=list)
    # De quantas em quantas horas procura uma versão nova (0 = nunca).
    update_interval_hours: float = DEFAULT_UPDATE_INTERVAL_HOURS
    # Auditoria do Windows (quem fez cada ação); só vale no agente instalado.
    windows_audit: bool = True

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

        collection_interval = _parse_collection_interval(
            os.getenv("INFRAOBSERVER_COLLECTION_INTERVAL"),
        )

        monitored_directories = _parse_list(
            os.getenv("INFRAOBSERVER_MONITORED_DIRECTORIES"),
        )
        ignored_patterns = _parse_list(
            os.getenv("INFRAOBSERVER_IGNORED_PATTERNS"),
        )

        update_interval_hours = _parse_update_interval(
            os.getenv("INFRAOBSERVER_UPDATE_INTERVAL_HOURS"),
        )

        windows_audit = _parse_bool(
            os.getenv("INFRAOBSERVER_WINDOWS_AUDIT"),
            default=True,
        )

        return cls(
            server_url=server_url,
            agent_token=agent_token,
            agent_id=UUID(agent_id),
            collection_interval=collection_interval,
            monitored_directories=monitored_directories,
            ignored_patterns=ignored_patterns,
            update_interval_hours=update_interval_hours,
            windows_audit=windows_audit,
        )
