from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class FileEventType(StrEnum):
    CREATE = "CREATE"
    MODIFY = "MODIFY"
    DELETE = "DELETE"
    RENAME = "RENAME"


@dataclass(frozen=True)
class FileEvent:
    event_type: FileEventType
    file_path: str
    username: str
    occurred_at: datetime