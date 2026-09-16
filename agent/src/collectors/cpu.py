import psutil


class CpuCollector:
    def collect(self) -> float:
        return psutil.cpu_percent(interval=0.1)