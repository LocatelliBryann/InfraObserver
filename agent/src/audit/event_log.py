import logging

from src.audit.events import AUDITED_EVENT_IDS, record_id_of

logger = logging.getLogger(__name__)

SECURITY_LOG = "Security"
# Quantos eventos pedir por vez ao Windows.
BATCH_SIZE = 200
# Teto por leitura, para uma rajada não travar o agente.
MAX_EVENTS_PER_READ = 2000


def build_query(after_record_id: int) -> str:
    """XPath dos eventos de auditoria de arquivo depois de um registro."""
    ids = " or ".join(f"EventID={event_id}" for event_id in AUDITED_EVENT_IDS)

    return f"*[System[({ids}) and EventRecordID>{int(after_record_id)}]]"


class SecurityEventLog:
    """Lê o log de Segurança pela API do Windows (wevtapi, via pywin32).

    A API devolve o XML em Unicode, então caminhos com acento
    ("Área de Trabalho") chegam certos.
    """

    def __init__(self, evtlog_module=None):
        if evtlog_module is None:
            import win32evtlog  # só existe no Windows (pywin32)

            evtlog_module = win32evtlog

        self.evt = evtlog_module

    def latest_record_id(self) -> int:
        """Número do último registro: a leitura começa depois dele."""
        handle = self.evt.EvtQuery(
            SECURITY_LOG,
            self.evt.EvtQueryChannelPath | self.evt.EvtQueryReverseDirection,
            "*",
        )
        events = self.evt.EvtNext(handle, 1)

        if not events:
            return 0

        xml_text = self.evt.EvtRender(events[0], self.evt.EvtRenderEventXml)

        return record_id_of(xml_text)

    def read_after(self, record_id: int) -> list[str]:
        """XML dos eventos de auditoria depois do registro, do mais antigo."""
        handle = self.evt.EvtQuery(
            SECURITY_LOG,
            self.evt.EvtQueryChannelPath | self.evt.EvtQueryForwardDirection,
            build_query(record_id),
        )
        result: list[str] = []

        while len(result) < MAX_EVENTS_PER_READ:
            events = self.evt.EvtNext(handle, BATCH_SIZE)

            if not events:
                break

            result.extend(
                self.evt.EvtRender(event, self.evt.EvtRenderEventXml)
                for event in events
            )

        return result

