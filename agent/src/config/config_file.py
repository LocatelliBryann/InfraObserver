import logging
import os
import platform
import sys
from collections.abc import MutableMapping
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

CONFIG_FILE_NAME = "agent.env"
AGENT_ID_FILE_NAME = "agent-id"
DATA_DIRECTORY_NAME = "InfraObserver"


def resolve_config_path(
    environ: MutableMapping[str, str],
    frozen: bool,
    system: str,
) -> Path | None:
    """Arquivo de configuração do agente.

    - ``INFRAOBSERVER_CONFIG`` aponta o arquivo explicitamente (o serviço do
      Windows define essa variável);
    - instalado no Windows (executável gerado pelo PyInstaller), usa
      ``%ProgramData%\\InfraObserver\\agent.env``;
    - rodando do código-fonte, devolve ``None`` e vale o ``.env`` da pasta.
    """
    explicit = environ.get("INFRAOBSERVER_CONFIG", "").strip()

    if explicit:
        return Path(explicit)

    if frozen and system == "Windows":
        program_data = environ.get("ProgramData") or r"C:\ProgramData"
        return Path(program_data) / DATA_DIRECTORY_NAME / CONFIG_FILE_NAME

    return None


def load_configuration(
    environ: MutableMapping[str, str] = os.environ,
    frozen: bool | None = None,
    system: str | None = None,
) -> Path | None:
    """Carrega o arquivo de configuração sem sobrescrever variáveis já definidas.

    Devolve o caminho usado, ou ``None`` quando o agente roda do código-fonte.
    """
    if frozen is None:
        frozen = bool(getattr(sys, "frozen", False))

    if system is None:
        system = platform.system()

    config_path = resolve_config_path(environ, frozen, system)

    if config_path is None:
        load_dotenv()
        return None

    if config_path.is_file():
        # utf-8-sig: o instalador grava o arquivo em UTF-8 com BOM.
        # interpolate=False: um token com "$" não pode virar outra coisa.
        load_dotenv(
            config_path,
            override=False,
            interpolate=False,
            encoding="utf-8-sig",
        )
        logger.info("Configuration loaded from %s", config_path)
    else:
        logger.warning("Configuration file not found: %s", config_path)

    return config_path


def agent_id_file_for(config_path: Path | None) -> Path:
    """O identificador do endpoint fica salvo ao lado do arquivo de configuração.

    Rodando do código-fonte (sem arquivo definido), fica na pasta atual, junto
    do ``.env``.
    """
    if config_path is None:
        return Path(AGENT_ID_FILE_NAME)

    return config_path.parent / AGENT_ID_FILE_NAME
