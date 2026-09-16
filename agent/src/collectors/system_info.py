import platform
import socket
from dataclasses import dataclass


@dataclass(frozen=True)
class SystemInfo:
    hostname: str
    ip_address: str
    os_name: str
    os_version: str


class SystemInfoCollector:
    def collect(self) -> SystemInfo:
        hostname = socket.gethostname()

        try:
            ip_address = socket.gethostbyname(hostname)
        except OSError as error:
            raise RuntimeError(
                "Unable to determine endpoint IP address"
            ) from error

        return SystemInfo(
            hostname=hostname,
            ip_address=ip_address,
            os_name=platform.system(),
            os_version=platform.release(),
        )
    