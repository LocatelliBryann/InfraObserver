import psutil
from dataclasses import dataclass


@dataclass(frozen=True)
class DiskInfo:
    used: int
    total: int


class DiskCollector:
    def collect(self) -> DiskInfo:
        disk = psutil.disk_usage("/")

        return DiskInfo(
            used=disk.used,
            total=disk.total,
        )