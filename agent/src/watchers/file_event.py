from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class FileEventType(StrEnum):
    CREATE = "CREATE"
    MODIFY = "MODIFY"
    DELETE = "DELETE"
    # Novo nome na mesma pasta.
    RENAME = "RENAME"
    # Levado para outra pasta.
    MOVE = "MOVE"


@dataclass(frozen=True)
class FileEvent:
    event_type: FileEventType
    file_path: str
    username: str
    occurred_at: datetime
    # Caminho anterior, em RENAME e MOVE.
    previous_path: str | None = None
    is_directory: bool = False
