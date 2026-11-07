import logging
from collections.abc import MutableMapping
from pathlib import Path
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)

AGENT_ID_VARIABLE = "INFRAOBSERVER_AGENT_ID"


def _read_agent_id(id_file: Path) -> str | None:
    try:
        return str(UUID(id_file.read_text(encoding="utf-8").strip()))
    except ValueError:
        logger.warning("Invalid agent id in %s, generating a new one", id_file)
        return None


def ensure_agent_id(
    environ: MutableMapping[str, str],
    id_file: Path | None,
) -> None:
    """Garante um identificador fixo para o endpoint.

    Se ``INFRAOBSERVER_AGENT_ID`` não estiver configurado, usa o identificador
    salvo em ``id_file`` ou gera um novo na primeira execução. Assim cada
    computador instalado vira um único endpoint no dashboard, mesmo depois de
    reinstalar ou atualizar o agente.
    """
    if environ.get(AGENT_ID_VARIABLE, "").strip() or id_file is None:
        return

    agent_id = _read_agent_id(id_file) if id_file.is_file() else None

    if agent_id is None:
        agent_id = str(uuid4())
        id_file.parent.mkdir(parents=True, exist_ok=True)
        id_file.write_text(agent_id + "\n", encoding="utf-8")
        logger.info("Generated agent id %s", agent_id)

    environ[AGENT_ID_VARIABLE] = agent_id
