from dataclasses import dataclass

from src.collectors.cpu import CpuCollector
from src.collectors.disk import DiskCollector
from src.collectors.memory import MemoryCollector
from src.collectors.network import NetworkCollector


@dataclass(frozen=True)
class MetricSnapshot:
    cpu_percent: float
    memory_used: int
    memory_total: int
    disk_used: int
    disk_total: int
    net_bytes_sent: int
    net_bytes_recv: int


class MetricsCollector:
    def __init__(
        self,
        cpu_collector: CpuCollector,
        memory_collector: MemoryCollector,
        disk_collector: DiskCollector,
        network_collector: NetworkCollector,
    ):
        self.cpu_collector = cpu_collector
        self.memory_collector = memory_collector
        self.disk_collector = disk_collector
        self.network_collector = network_collector

    def collect(self) -> MetricSnapshot:
        cpu_percent = self.cpu_collector.collect()
        memory = self.memory_collector.collect()
        disk = self.disk_collector.collect()
        network = self.network_collector.collect()

        return MetricSnapshot(
            cpu_percent=cpu_percent,
            memory_used=memory.used,
            memory_total=memory.total,
            disk_used=disk.used,
            disk_total=disk.total,
            net_bytes_sent=network.bytes_sent,
            net_bytes_recv=network.bytes_recv,
        )