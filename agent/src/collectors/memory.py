import psutil
from dataclasses import dataclass


@dataclass(frozen=True)
class MemoryInfo:
    used: int
    total: int


class MemoryCollector:
    def collect(self) -> MemoryInfo:
        memory = psutil.virtual_memory()

        return MemoryInfo(
            used=memory.used,
            total=memory.total,
        )