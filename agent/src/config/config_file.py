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


_QUOTES = ('"', "'")


def parse_config_file(text: str) -> dict[str, str]:
    """Lê o agent.env sem interpretar barras invertidas.

    O python-dotenv trata "\\a", "\\n" e "\\t" entre aspas duplas como
    caracteres especiais, o que estraga caminhos do Windows: "D:\\a\\pasta"
    virava "D:<bell>\\pasta" e "C:\\Users\\nome" ganhava uma quebra de linha.
    O instalador grava KEY="valor" sem aspas dentro do valor, então aqui o
    valor é usado como está, só sem as aspas de fora.
    """
    values: dict[str, str] = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#"):
            continue

        if line.startswith("export "):
            line = line[len("export "):].lstrip()

        key, separator, value = line.partition("=")
        key = key.strip()

        if not separator or not key:
            continue

        value = value.strip()

        if len(value) >= 2 and value[0] in _QUOTES and value[-1] == value[0]:
            value = value[1:-1]
        else:
            # Sem aspas, " #" começa um comentário.
            value = value.split(" #", 1)[0].rstrip()

        values[key] = value

    return values


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
        # utf-8-sig: o instalador grava o arquivo em UTF-8 com BOM. Os valores
        # são usados como estão: sem "$" virando variável nem "\\" virando escape.
        text = config_path.read_text(encoding="utf-8-sig")

        for key, value in parse_config_file(text).items():
            # Variáveis já definidas (ex.: pelo serviço) têm prioridade.
            environ.setdefault(key, value)

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
