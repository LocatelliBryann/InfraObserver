import logging
import os
from collections.abc import Callable, MutableMapping

from src.collectors.system_info import SystemInfoCollector
from src.config.credential_store import AGENT_TOKEN_VARIABLE
from src.config.settings import AgentSettings
from src.version import __version__

logger = logging.getLogger(__name__)

# Token de instalação do cliente (gerado no dashboard, em Clientes).
ENROLLMENT_TOKEN_PREFIX = "ioe_"
# Credencial própria deste computador, devolvida pelo servidor.
AGENT_CREDENTIAL_PREFIX = "ioa_"


class EnrollmentError(Exception):
    """O servidor não devolveu uma credencial válida."""


class RegistrationService:
    def __init__(
        self,
        http_client,
        settings: AgentSettings,
        system_info_collector: SystemInfoCollector,
        save_token: Callable[[str], None] | None = None,
        environ: MutableMapping[str, str] = os.environ,
    ):
        self.http_client = http_client
        self.settings = settings
        self.system_info_collector = system_info_collector
        # Onde guardar a credencial recebida (o agent.env). Sem isso, ela vale
        # só até o agente reiniciar e a instalação é refeita na próxima vez.
        self.save_token = save_token
        self.environ = environ

    def build_payload(self) -> dict:
        system_info = self.system_info_collector.collect()

        return {
            "agentId": str(self.settings.agent_id),
            "hostname": system_info.hostname,
            "ipAddress": system_info.ip_address,
            "osName": system_info.os_name,
            "osVersion": system_info.os_version,
            "agentVersion": __version__,
        }

    def needs_enrollment(self) -> bool:
        token = getattr(self.http_client, "agent_token", None)

        return isinstance(token, str) and token.startswith(ENROLLMENT_TOKEN_PREFIX)

    def register(self):
        if self.needs_enrollment():
            return self.enroll()

        return self.http_client.post(
            "/api/v1/endpoints/register",
            self.build_payload(),
        )

    def enroll(self):
        """Troca o token de instalação por uma credencial só deste computador.

        O registro do endpoint acontece junto, na mesma requisição. A partir
        daí, todas as chamadas (métricas, eventos, fila, atualização) usam a
        credencial nova, porque o http_client é o mesmo.
        """
        response = self.http_client.post(
            "/api/v1/agents/enroll",
            self.build_payload(),
        )
        credential = response.json().get("credential")

        if not isinstance(credential, str) or not credential.startswith(
            AGENT_CREDENTIAL_PREFIX
        ):
            raise EnrollmentError("Server did not return an agent credential")

        self.http_client.agent_token = credential
        self.environ[AGENT_TOKEN_VARIABLE] = credential

        if self.save_token is None:
            logger.warning(
                "Agent enrolled, but the credential was not saved: "
                "it will enroll again on the next start"
            )
            return response

        try:
            self.save_token(credential)
            logger.info("Agent enrolled; credential saved to the configuration")
        except OSError:
            # Continua com a credencial em memória; na próxima partida, se o
            # token de instalação ainda valer, o agente se inscreve de novo.
            logger.exception("Agent enrolled, but the credential could not be saved")

        return response
