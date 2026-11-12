import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

AGENT_TOKEN_VARIABLE = "INFRAOBSERVER_AGENT_TOKEN"


def _is_token_line(line: str) -> bool:
    stripped = line.strip()

    if stripped.startswith("export "):
        stripped = stripped[len("export "):].lstrip()

    key, separator, _ = stripped.partition("=")

    return separator == "=" and key.strip() == AGENT_TOKEN_VARIABLE


def save_agent_token(config_path: Path, token: str) -> None:
    """Grava o token no arquivo de configuração, trocando só a linha dele.

    As outras linhas (endereço do servidor, pastas, comentários) ficam como
    estão. O arquivo novo é escrito ao lado e trocado de uma vez (os.replace),
    para não sobrar um agent.env pela metade se o computador desligar no meio.
    Fica em UTF-8 com BOM, igual ao que o instalador grava.
    """
    if any(character in token for character in '"\r\n'):
        raise ValueError("Agent token cannot contain quotes or line breaks")

    try:
        lines = config_path.read_text(encoding="utf-8-sig").splitlines()
    except FileNotFoundError:
        lines = []

    new_line = f'{AGENT_TOKEN_VARIABLE}="{token}"'
    replaced = False

    for index, line in enumerate(lines):
        if _is_token_line(line):
            lines[index] = new_line
            replaced = True

    if not replaced:
        lines.append(new_line)

    temporary_path = config_path.with_name(config_path.name + ".tmp")
    config_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8-sig")
    os.replace(temporary_path, config_path)
