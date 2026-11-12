import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from datetime import datetime, timezone

# 4663: tentativa de acesso a um objeto (traz o caminho, o usuário e o programa).
EVENT_OBJECT_ACCESS = 4663
# 4660: objeto excluído (só traz o handle; o caminho vem do 4663 anterior).
EVENT_OBJECT_DELETED = 4660
# 5145: acesso a um arquivo pelo compartilhamento de rede (traz o IP de origem).
EVENT_SHARE_ACCESS = 5145

AUDITED_EVENT_IDS = (EVENT_OBJECT_ACCESS, EVENT_OBJECT_DELETED, EVENT_SHARE_ACCESS)

_NAMESPACE = {"e": "http://schemas.microsoft.com/win/2004/08/events/event"}

# Bits do AccessMask que interessam (os nomes são os do Windows).
WRITE_DATA = 0x2  # WriteData / AddFile
APPEND_DATA = 0x4  # AppendData / AddSubdirectory
DELETE_CHILD = 0x40
DELETE = 0x10000
CHANGE_MASK = WRITE_DATA | APPEND_DATA | DELETE_CHILD | DELETE

# Valores que o Windows usa para "sem informação" ou acesso local.
_EMPTY_VALUES = {"", "-"}
_LOCAL_ADDRESSES = {"127.0.0.1", "::1"}
# Prefixo do caminho local do compartilhamento no 5145 (\??\C:\Pasta).
_NT_PATH_PREFIX = "\\??\\"


@dataclass(frozen=True)
class AuditRecord:
    record_id: int
    event_id: int
    occurred_at: datetime
    user: str | None
    domain: str | None
    path: str | None
    access_mask: int
    process: str | None
    source_ip: str | None
    handle_id: str | None


def _clean(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()

    return None if value in _EMPTY_VALUES else value


def _parse_mask(value: str | None) -> int:
    try:
        return int(value or "0", 0)
    except ValueError:
        return 0


def _parse_time(value: str | None) -> datetime:
    # Ex.: 2026-11-12T22:10:05.1234567Z (7 casas; o Python aceita até 6).
    if not value:
        return datetime.now(timezone.utc)

    text = value.rstrip("Z")
    main, _, fraction = text.partition(".")
    text = f"{main}.{fraction[:6]}" if fraction else main

    try:
        return datetime.fromisoformat(text).replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def _share_path(local_path: str | None, relative: str | None) -> str | None:
    if not local_path:
        return None

    if local_path.startswith(_NT_PATH_PREFIX):
        local_path = local_path[len(_NT_PATH_PREFIX):]

    if not relative or relative == "\\":
        return local_path

    return f"{local_path.rstrip(chr(92))}\\{relative.lstrip(chr(92))}"


def parse_event(xml_text: str) -> AuditRecord | None:
    """Lê um evento do log de Segurança (XML do EvtRender).

    Devolve None para eventos de outros tipos, de contas de computador
    (terminadas em $) ou sem usuário.
    """
    try:
        root = ElementTree.fromstring(xml_text)
    except ElementTree.ParseError:
        return None

    system = root.find("e:System", _NAMESPACE)

    if system is None:
        return None

    try:
        event_id = int(system.findtext("e:EventID", "0", _NAMESPACE))
        record_id = int(system.findtext("e:EventRecordID", "0", _NAMESPACE))
    except ValueError:
        return None

    if event_id not in AUDITED_EVENT_IDS:
        return None

    created = system.find("e:TimeCreated", _NAMESPACE)
    data = {
        item.get("Name"): item.text
        for item in root.findall("e:EventData/e:Data", _NAMESPACE)
    }

    user = _clean(data.get("SubjectUserName"))

    if user is None or user.endswith("$"):
        return None

    if event_id == EVENT_SHARE_ACCESS:
        path = _share_path(
            _clean(data.get("ShareLocalPath")),
            _clean(data.get("RelativeTargetName")),
        )
    else:
        path = _clean(data.get("ObjectName"))

    source_ip = _clean(data.get("IpAddress"))

    return AuditRecord(
        record_id=record_id,
        event_id=event_id,
        occurred_at=_parse_time(created.get("SystemTime") if created is not None else None),
        user=user,
        domain=_clean(data.get("SubjectDomainName")),
        path=path,
        access_mask=_parse_mask(data.get("AccessMask")),
        process=_clean(data.get("ProcessName")),
        source_ip=None if source_ip in _LOCAL_ADDRESSES else source_ip,
        handle_id=_clean(data.get("HandleId")),
    )


def record_id_of(xml_text: str) -> int:
    """Número do registro, mesmo de eventos que parse_event descarta."""
    try:
        root = ElementTree.fromstring(xml_text)
        return int(root.findtext("e:System/e:EventRecordID", "0", _NAMESPACE))
    except (ElementTree.ParseError, ValueError):
        return 0
