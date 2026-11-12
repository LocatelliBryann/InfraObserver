import json
import logging
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock

import pytest

from audit_samples import access_4663, share_5145
from src.audit.actor_index import AuditIndex
from src.audit.enricher import AuditEnricher, enrich
from src.audit.event_log import SecurityEventLog, build_query
from src.audit.events import parse_event
from src.audit.poller import AuditPoller
from src.audit.service import WindowsAuditService
from src.watchers.file_event import FileEvent, FileEventType

AT = datetime(2026, 11, 12, 22, 10, 5, tzinfo=timezone.utc)
DOC = r"C:\Users\maria\Documents\relatorio.docx"


def file_event(event_type=FileEventType.MODIFY, path=DOC, previous=None):
    return FileEvent(
        event_type=event_type,
        file_path=path,
        username="sessao-aberta",
        occurred_at=AT,
        previous_path=previous,
    )


def index_with(*xml_events):
    index = AuditIndex(computer_name="DELL-C4J46Q3")

    for xml_text in xml_events:
        index.add(parse_event(xml_text))

    return index


# ---------- enrich ----------

def test_enrich_replaces_the_user_with_the_audited_one():
    event = enrich(index_with(access_4663(mask="0x2")), file_event())

    assert event.username == "maria"
    assert event.process_name == "explorer.exe"
    assert event.audited is True


def test_enrich_keeps_the_event_without_audit():
    original = file_event()

    assert enrich(index_with(), original) is original


def test_enrich_create_uses_the_parent_folder():
    index = index_with(access_4663(path=r"C:\Users\maria\Documents", mask="0x2"))

    event = enrich(index, file_event(FileEventType.CREATE, r"C:\Users\maria\Documents\novo.txt"))

    assert event.username == "maria"


def test_enrich_rename_and_move_use_the_old_path():
    index = index_with(access_4663())

    renamed = enrich(index, file_event(FileEventType.RENAME, r"C:\Users\maria\Documents\novo.docx", DOC))
    moved = enrich(index, file_event(FileEventType.MOVE, r"C:\Outra\relatorio.docx", DOC))

    assert renamed.username == "maria"
    assert moved.username == "maria"


def test_enrich_brings_the_ip_of_a_network_change():
    path = r"C:\Compartilhado\Financeiro\planilha.xlsx"
    index = index_with(access_4663(path=path, user="joao", domain="CARTORIO"), share_5145())

    event = enrich(index, file_event(FileEventType.DELETE, path))

    assert event.username == r"CARTORIO\joao"
    assert event.source_ip == "192.168.0.50"


# ---------- AuditEnricher ----------

class FakeClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def test_enricher_waits_the_delay_and_keeps_the_order():
    sent = []
    done = threading.Event()

    def send(event):
        sent.append(event.file_path)
        if len(sent) == 2:
            done.set()

    enricher = AuditEnricher(index_with(), send, delay_seconds=0.05)
    enricher.start()
    enricher.handle(file_event(path="a.txt"))
    enricher.handle(file_event(path="b.txt"))

    assert done.wait(2)
    enricher.stop()
    assert sent == ["a.txt", "b.txt"]


def test_enricher_completes_with_audit_that_arrives_during_the_delay():
    sent = []
    index = index_with()
    enricher = AuditEnricher(index, sent.append, delay_seconds=60, clock=FakeClock())

    enricher.handle(file_event())
    index.add(parse_event(access_4663(mask="0x2")))
    enricher.flush()

    assert sent[0].username == "maria"


def test_enricher_stop_delivers_pending_events_and_survives_send_errors():
    send = Mock(side_effect=[RuntimeError("falhou"), None])
    enricher = AuditEnricher(index_with(), send, delay_seconds=60)
    enricher.start()
    enricher.handle(file_event(path="a.txt"))
    enricher.handle(file_event(path="b.txt"))

    enricher.stop()

    assert send.call_count == 2


# ---------- poller ----------

class FakeLog:
    def __init__(self, batches):
        self.batches = list(batches)
        self.after = []

    def latest_record_id(self):
        return 100

    def read_after(self, record_id):
        self.after.append(record_id)
        return self.batches.pop(0) if self.batches else []


def test_poller_starts_from_now_and_advances_even_on_discarded_events():
    index = index_with()
    log = FakeLog([[access_4663(record_id=101), access_4663(record_id=102, user="PC$")], []])
    poller = AuditPoller(log, index)

    assert poller.poll_once() == 0
    assert poller.last_record_id == 100

    assert poller.poll_once() == 1
    assert poller.last_record_id == 102

    poller.poll_once()
    assert log.after == [100, 102]
    assert index.lookup(DOC, AT) is not None


def test_poller_thread_keeps_running_after_errors(monkeypatch):
    monkeypatch.setattr("src.audit.poller.ERROR_RETRY_SECONDS", 0.01)
    log = Mock()
    log.latest_record_id.side_effect = [RuntimeError("log fechado"), 5]
    log.read_after.return_value = []
    poller = AuditPoller(log, index_with(), poll_seconds=0.01)

    poller.start()
    for _ in range(200):
        if log.read_after.called:
            break
        threading.Event().wait(0.01)
    poller.stop()

    assert log.read_after.called


# ---------- leitura do log ----------

def test_build_query():
    assert build_query(42) == (
        "*[System[(EventID=4663 or EventID=4660 or EventID=5145) and EventRecordID>42]]"
    )


def make_evt_module(pages):
    module = Mock()
    module.EvtQueryChannelPath = 1
    module.EvtQueryReverseDirection = 0x200
    module.EvtQueryForwardDirection = 0x100
    module.EvtRenderEventXml = 1
    module.EvtNext.side_effect = pages
    module.EvtRender.side_effect = lambda event, _flags: event
    return module


def test_security_log_reads_in_batches():
    module = make_evt_module([["<e1/>", "<e2/>"], ["<e3/>"], []])

    assert SecurityEventLog(module).read_after(7) == ["<e1/>", "<e2/>", "<e3/>"]
    _, flags, query = module.EvtQuery.call_args.args
    assert flags == 0x101
    assert "EventRecordID>7" in query


def test_security_log_latest_record():
    assert SecurityEventLog(make_evt_module([[access_4663(record_id=999)]])).latest_record_id() == 999
    assert SecurityEventLog(make_evt_module([[]])).latest_record_id() == 0


# ---------- serviço ----------

def test_service_starts_everything_and_survives_a_failed_setup():
    configurator = Mock()
    configurator.enable.side_effect = RuntimeError("sem permissão")
    poller = Mock()
    enricher = Mock()
    service = WindowsAuditService(configurator, poller, enricher, ["C:\\pasta"])

    service.start()
    service._setup_thread.join(2)
    service.stop()

    configurator.enable.assert_called_once_with(["C:\\pasta"])
    enricher.start.assert_called_once()
    poller.start.assert_called_once()
    poller.stop.assert_called_once()
    enricher.stop.assert_called_once()
    assert service.handle is enricher.handle


def test_service_logs_how_many_folders_are_audited(caplog):
    caplog.set_level(logging.INFO)
    configurator = Mock()
    configurator.enable.return_value = ["a", "b"]
    poller = Mock()
    poller.start.side_effect = RuntimeError("sem log")
    service = WindowsAuditService(configurator, poller, Mock(), ["a", "b"])

    service.start()
    service._setup_thread.join(2)

    assert "enabled on 2 folder(s)" in caplog.text
    assert "Could not read the Windows Security log" in caplog.text
