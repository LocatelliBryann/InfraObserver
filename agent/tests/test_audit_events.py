from datetime import datetime, timezone

from audit_samples import access_4663, deleted_4660, event_xml, share_5145
from src.audit.events import DELETE, parse_event, record_id_of


def test_parses_an_object_access_event():
    record = parse_event(access_4663())

    assert record.event_id == 4663
    assert record.record_id == 101
    assert record.user == "maria"
    assert record.domain == "DELL-C4J46Q3"
    assert record.path == r"C:\Users\maria\Documents\relatorio.docx"
    assert record.access_mask == DELETE
    assert record.process == r"C:\Windows\explorer.exe"
    assert record.handle_id == "0x1a4"
    assert record.source_ip is None
    assert record.occurred_at == datetime(2026, 11, 12, 22, 10, 5, 123456, tzinfo=timezone.utc)


def test_parses_paths_with_accents():
    record = parse_event(access_4663(path=r"C:\Users\maria\Área de Trabalho\nota.txt"))

    assert record.path == r"C:\Users\maria\Área de Trabalho\nota.txt"


def test_parses_a_deleted_object_event():
    record = parse_event(deleted_4660())

    assert record.event_id == 4660
    assert record.handle_id == "0x1a4"
    assert record.path is None


def test_builds_the_full_path_of_a_share_access():
    record = parse_event(share_5145())

    assert record.event_id == 5145
    assert record.path == r"C:\Compartilhado\Financeiro\planilha.xlsx"
    assert record.source_ip == "192.168.0.50"
    assert record.user == "joao"


def test_share_root_and_loopback_address():
    record = parse_event(share_5145(relative="\\", ip="::1"))

    assert record.path == r"C:\Compartilhado"
    assert record.source_ip is None


def test_ignores_computer_accounts_empty_users_and_other_events():
    assert parse_event(access_4663(user="DELL-C4J46Q3$")) is None
    assert parse_event(access_4663(user="-")) is None
    assert parse_event(event_xml(4624, 1, {"SubjectUserName": "maria"})) is None
    assert parse_event("<isso não é xml") is None
    assert parse_event("<Event/>") is None


def test_handles_unexpected_values():
    record = parse_event(access_4663(mask="abc", time="data-invalida"))

    assert record.access_mask == 0
    assert record.occurred_at.tzinfo is not None


def test_reads_the_record_id_even_of_discarded_events():
    assert record_id_of(access_4663(record_id=555, user="PC$")) == 555
    assert record_id_of("quebrado") == 0
