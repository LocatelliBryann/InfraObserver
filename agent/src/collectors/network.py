import psutil
from dataclasses import dataclass


@dataclass(frozen=True)
class NetworkInfo:
    bytes_sent: int
    bytes_recv: int


class NetworkCollector:
    def collect(self) -> NetworkInfo:
        counters = psutil.net_io_counters()

        return NetworkInfo(
            bytes_sent=counters.bytes_sent,
            bytes_recv=counters.bytes_recv,
        )