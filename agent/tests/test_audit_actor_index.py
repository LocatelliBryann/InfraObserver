from datetime import datetime, timedelta, timezone

from audit_samples import access_4663, deleted_4660, share_5145
from src.audit.actor_index import (
    AuditIndex,
    display_user,
    normalize_path,
    parent_path,
    process_name,
)
from src.audit.events import parse_event

AT = datetime(2026, 11, 12, 22, 10, 5, 123456, tzinfo=timezone.utc)


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def make_index(clock=None):
    return AuditIndex(computer_name="DELL-C4J46Q3", clock=clock or FakeClock())


def test_helpers():
    assert normalize_path("C:/Users/Maria/Docs/") == r"c:\users\maria\docs"
    assert parent_path(r"C:\Users\maria\a.txt") == r"c:\users\maria"
    assert parent_path("arquivo") == "arquivo"
    assert display_user("maria", "DELL-C4J46Q3", "dell-c4j46q3") == "maria"
    assert display_user("joao", "CARTORIO", "DELL-C4J46Q3") == r"CARTORIO\joao"
    assert display_user("maria", None, None) == "maria"
    assert process_name(r"C:\Windows\explorer.exe") == "explorer.exe"
    assert process_name(None) is None


def test_finds_who_changed_a_file_ignoring_case_and_slashes():
    index = make_index()
    index.add(parse_event(access_4663()))

    actor = index.lookup("c:/users/MARIA/documents/relatorio.docx", AT)

    assert actor.user == "maria"
    assert actor.process == "explorer.exe"
    assert actor.source_ip is None


def test_ignores_reads():
    index = make_index()
    index.add(parse_event(access_4663(mask="0x1")))

    assert index.lookup(r"C:\Users\maria\Documents\relatorio.docx", AT) is None


def test_uses_the_parent_folder_only_when_asked():
    index = make_index()
    index.add(parse_event(access_4663(path=r"C:\Users\maria\Documents", mask="0x2")))
    novo = r"C:\Users\maria\Documents\novo.txt"

    assert index.lookup(novo, AT) is None
    assert index.lookup(novo, AT, include_parent=True).user == "maria"


def test_share_access_adds_the_source_ip_to_the_same_path():
    index = make_index()
    path = r"C:\Compartilhado\Financeiro\planilha.xlsx"
    index.add(parse_event(access_4663(path=path, user="joao", domain="CARTORIO")))
    index.add(parse_event(share_5145()))

    actor = index.lookup(path, AT)

    assert actor.user == r"CARTORIO\joao"
    assert actor.process == "explorer.exe"
    assert actor.source_ip == "192.168.0.50"


def test_keeps_the_ip_when_the_access_event_comes_after_the_share_event():
    index = make_index()
    path = r"C:\Compartilhado\Financeiro\planilha.xlsx"
    index.add(parse_event(share_5145()))
    index.add(parse_event(access_4663(path=path, user="joao", domain="CARTORIO")))

    assert index.lookup(path, AT).source_ip == "192.168.0.50"


def test_deleted_event_is_matched_by_handle():
    index = make_index()
    index.add(parse_event(access_4663()))
    index.add(parse_event(deleted_4660()))
    index.add(parse_event(deleted_4660(handle="0xdesconhecido")))

    assert index.lookup(r"C:\Users\maria\Documents\relatorio.docx", AT).user == "maria"


def test_entries_expire_and_must_be_close_in_time():
    clock = FakeClock()
    index = make_index(clock)
    index.add(parse_event(access_4663()))
    path = r"C:\Users\maria\Documents\relatorio.docx"

    assert index.lookup(path, AT + timedelta(minutes=5)) is None

    clock.now += 500

    assert index.lookup(path, AT) is None


def test_memory_is_limited(monkeypatch):
    monkeypatch.setattr("src.audit.actor_index.MAX_ENTRIES", 3)
    monkeypatch.setattr("src.audit.actor_index.MAX_HANDLES", 2)
    index = make_index()

    for number in range(6):
        index.add(parse_event(access_4663(path=rf"C:\pasta\{number}.txt", handle=f"0x{number}")))

    assert len(index._actors) <= 3
    assert len(index._handles) <= 2
