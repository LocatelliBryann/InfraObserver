import logging
import threading
from unittest.mock import Mock

import pytest
import requests

from src.services.outbox import Outbox, OutboxSender


class FakeServer:
    """Servidor que pode ficar fora do ar e guarda o que recebeu."""

    def __init__(self):
        self.online = True
        self.received = []
        self.reject = set()

    def post(self, path, payload):
        if not self.online:
            raise requests.ConnectionError("network is unreachable")

        if payload.get("name") in self.reject:
            response = Mock(status_code=400)
            raise requests.HTTPError("400 Bad Request", response=response)

        self.received.append((path, payload["name"]))


@pytest.fixture
def outbox(tmp_path):
    queue = Outbox(tmp_path / "data" / "outbox.db")
    yield queue
    queue.close()


def test_items_survive_a_restart_of_the_agent(tmp_path):
    path = tmp_path / "outbox.db"
    first = Outbox(path)
    first.put("/api/v1/file-events", {"name": "contrato.pdf"})
    first.close()

    second = Outbox(path)

    assert [(item.path, item.payload) for item in second.peek(10)] == [
        ("/api/v1/file-events", {"name": "contrato.pdf"}),
    ]
    second.close()


def test_events_made_offline_are_sent_in_order_when_the_network_returns(outbox, caplog):
    server = FakeServer()
    sender = OutboxSender(outbox, server)

    server.online = False
    for name in ("criado.txt", "renomeado.txt", "excluido.txt"):
        outbox.put("/api/v1/file-events", {"name": name})
    outbox.put("/api/v1/metrics", {"name": "metrica"})

    assert sender.flush() is False
    assert outbox.count() == 4
    assert "Server unreachable, keeping 4 items queued" in caplog.text

    server.online = True
    with caplog.at_level(logging.INFO):
        assert sender.flush() is True

    assert server.received == [
        ("/api/v1/file-events", "criado.txt"),
        ("/api/v1/file-events", "renomeado.txt"),
        ("/api/v1/file-events", "excluido.txt"),
        ("/api/v1/metrics", "metrica"),
    ]
    assert outbox.count() == 0
    assert "Connection restored, sent 4 queued items" in caplog.text


def test_server_errors_keep_the_item_for_later(outbox):
    server = Mock()
    server.post.side_effect = requests.HTTPError("503", response=Mock(status_code=503))
    sender = OutboxSender(outbox, server)
    outbox.put("/api/v1/metrics", {"name": "metrica"})

    assert sender.flush() is False
    assert outbox.count() == 1


def test_items_the_server_rejects_are_discarded_so_the_queue_moves_on(outbox, caplog):
    server = FakeServer()
    server.reject.add("quebrado")
    sender = OutboxSender(outbox, server)
    outbox.put("/api/v1/file-events", {"name": "quebrado"})
    outbox.put("/api/v1/file-events", {"name": "valido"})

    assert sender.flush() is True

    assert server.received == [("/api/v1/file-events", "valido")]
    assert "Server rejected queued item for /api/v1/file-events (HTTP 400)" in caplog.text


def test_error_without_response_keeps_the_item(outbox):
    server = Mock()
    server.post.side_effect = requests.HTTPError("sem resposta")
    sender = OutboxSender(outbox, server)
    outbox.put("/api/v1/metrics", {"name": "metrica"})

    assert sender.flush() is False
    assert outbox.count() == 1


def test_sends_large_queues_in_batches(outbox):
    server = FakeServer()
    sender = OutboxSender(outbox, server, batch_size=2)

    for index in range(5):
        outbox.put("/api/v1/metrics", {"name": str(index)})

    assert sender.flush() is True
    assert [name for _, name in server.received] == ["0", "1", "2", "3", "4"]


def test_old_items_are_discarded_after_the_age_limit(tmp_path, caplog):
    now = [1_000_000.0]
    outbox = Outbox(tmp_path / "outbox.db", max_age_seconds=60, clock=lambda: now[0])
    outbox.put("/api/v1/metrics", {"name": "antiga"})
    now[0] += 61
    outbox.put("/api/v1/metrics", {"name": "nova"})

    assert outbox.prune() == 1

    assert [item.payload["name"] for item in outbox.peek(10)] == ["nova"]
    assert "discarded 1 oldest items" in caplog.text
    outbox.close()


def test_oldest_items_go_first_when_the_queue_is_full(tmp_path):
    outbox = Outbox(tmp_path / "outbox.db", max_items=3)

    for index in range(5):
        outbox.put("/api/v1/metrics", {"name": str(index)})

    assert outbox.prune() == 2
    assert [item.payload["name"] for item in outbox.peek(10)] == ["2", "3", "4"]
    assert outbox.prune() == 0
    outbox.close()


def test_waits_longer_between_attempts_while_offline(outbox):
    server = FakeServer()
    server.online = False
    sender = OutboxSender(outbox, server, idle_seconds=2, min_retry_seconds=5, max_retry_seconds=20)
    outbox.put("/api/v1/metrics", {"name": "metrica"})

    assert [sender.run_once() for _ in range(4)] == [5, 10, 20, 20]

    server.online = True
    assert sender.run_once() == 2
    assert sender.retry_seconds == 5


def test_background_thread_sends_and_stops(outbox):
    sent = threading.Event()
    server = Mock()
    server.post.side_effect = lambda path, payload: sent.set()
    sender = OutboxSender(outbox, server, idle_seconds=0.05)

    sender.start()
    outbox.put("/api/v1/file-events", {"name": "arquivo"})

    assert sent.wait(timeout=5)
    sender.stop()
    assert sender._thread is None


def test_background_thread_survives_unexpected_errors(outbox, caplog):
    sender = OutboxSender(outbox, Mock(), max_retry_seconds=0.01)
    calls = []

    def broken_run_once():
        calls.append(1)
        if len(calls) >= 2:
            sender._stop.set()
        raise RuntimeError("bug")

    sender.run_once = broken_run_once
    sender._loop()

    assert len(calls) == 2
    assert "Unexpected error while sending the queue" in caplog.text
