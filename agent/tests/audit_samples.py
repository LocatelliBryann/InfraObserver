"""XML de eventos reais do log de Segurança (formato do EvtRender)."""

NS = "http://schemas.microsoft.com/win/2004/08/events/event"


def event_xml(event_id: int, record_id: int, data: dict[str, str], time="2026-11-12T22:10:05.1234567Z") -> str:
    items = "".join(f'<Data Name="{name}">{value}</Data>' for name, value in data.items())

    return (
        f'<Event xmlns="{NS}"><System>'
        '<Provider Name="Microsoft-Windows-Security-Auditing"/>'
        f"<EventID>{event_id}</EventID>"
        f'<TimeCreated SystemTime="{time}"/>'
        f"<EventRecordID>{record_id}</EventRecordID>"
        "<Channel>Security</Channel>"
        f"</System><EventData>{items}</EventData></Event>"
    )


def access_4663(record_id=101, path=r"C:\Users\maria\Documents\relatorio.docx", mask="0x10000", user="maria", domain="DELL-C4J46Q3", handle="0x1a4", process=r"C:\Windows\explorer.exe", time="2026-11-12T22:10:05.1234567Z"):
    return event_xml(4663, record_id, {
        "SubjectUserSid": "S-1-5-21-1",
        "SubjectUserName": user,
        "SubjectDomainName": domain,
        "SubjectLogonId": "0x3e7",
        "ObjectServer": "Security",
        "ObjectType": "File",
        "ObjectName": path,
        "HandleId": handle,
        "AccessList": "%%1537",
        "AccessMask": mask,
        "ProcessId": "0x1234",
        "ProcessName": process,
    }, time)


def deleted_4660(record_id=102, handle="0x1a4", user="maria"):
    return event_xml(4660, record_id, {
        "SubjectUserName": user,
        "SubjectDomainName": "DELL-C4J46Q3",
        "ObjectServer": "Security",
        "HandleId": handle,
        "ProcessName": r"C:\Windows\explorer.exe",
    })


def share_5145(record_id=103, ip="192.168.0.50", local=r"\??\C:\Compartilhado", relative=r"Financeiro\planilha.xlsx", user="joao", domain="CARTORIO"):
    return event_xml(5145, record_id, {
        "SubjectUserName": user,
        "SubjectDomainName": domain,
        "ObjectType": "File",
        "IpAddress": ip,
        "IpPort": "50123",
        "ShareName": r"\\*\Compartilhado",
        "ShareLocalPath": local,
        "RelativeTargetName": relative,
        "AccessMask": "0x10000",
    })
