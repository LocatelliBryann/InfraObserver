"""Fila local de envios do agente.

Eventos de arquivo e métricas entram primeiro numa fila em disco (SQLite) e
só saem dela depois que o servidor confirma o recebimento. Sem rede, nada se
perde: quando a conexão volta, a fila é enviada na ordem em que tudo aconteceu,
com o horário original de cada evento.
"""

import json
import logging
import sqlite3
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

# Um computador semanas sem rede não pode lotar o disco: acima desses limites
# os itens mais antigos saem primeiro.
MAX_ITEMS = 50_000
MAX_AGE_SECONDS = 7 * 24 * 3600

# Respostas que nunca vão dar certo, por mais que o agente tente de novo.
_REJECTED_STATUS = {400, 413, 422}


@dataclass(frozen=True)
class OutboxItem:
    id: int
    path: str
    payload: dict


class Outbox:
    def __init__(
        self,
        path: Path,
        max_items: int = MAX_ITEMS,
        max_age_seconds: float = MAX_AGE_SECONDS,
        clock: Callable[[], float] = time.time,
    ):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.max_items = max_items
        self.max_age_seconds = max_age_seconds
        self.clock = clock
        self._lock = threading.Lock()
        # Usada pela thread do watchdog, pelo laço principal e pelo envio.
        self._connection = sqlite3.connect(
            str(path),
            check_same_thread=False,
            isolation_level=None,
        )
        self._connection.execute(
            "CREATE TABLE IF NOT EXISTS outbox ("
            " id INTEGER PRIMARY KEY AUTOINCREMENT,"
            " path TEXT NOT NULL,"
            " payload TEXT NOT NULL,"
            " created_at REAL NOT NULL)"
        )

    def put(self, path: str, payload: dict) -> None:
        with self._lock:
            self._connection.execute(
                "INSERT INTO outbox (path, payload, created_at) VALUES (?, ?, ?)",
                (path, json.dumps(payload), self.clock()),
            )

    def peek(self, limit: int) -> list[OutboxItem]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT id, path, payload FROM outbox ORDER BY id LIMIT ?",
                (limit,),
            ).fetchall()

        return [OutboxItem(row[0], row[1], json.loads(row[2])) for row in rows]

    def remove(self, item_id: int) -> None:
        with self._lock:
            self._connection.execute("DELETE FROM outbox WHERE id = ?", (item_id,))

    def count(self) -> int:
        with self._lock:
            return self._connection.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]

    def prune(self) -> int:
        """Remove o que passou do limite de idade ou de quantidade."""
        with self._lock:
            expired = self._connection.execute(
                "DELETE FROM outbox WHERE created_at < ?",
                (self.clock() - self.max_age_seconds,),
            ).rowcount
            total = self._connection.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]
            excess = max(total - self.max_items, 0)

            if excess:
                self._connection.execute(
                    "DELETE FROM outbox WHERE id IN"
                    " (SELECT id FROM outbox ORDER BY id LIMIT ?)",
                    (excess,),
                )

        dropped = expired + excess

        if dropped:
            logger.warning("Queue limit reached, discarded %s oldest items", dropped)

        return dropped

    def close(self) -> None:
        with self._lock:
            self._connection.close()


class OutboxSender:
    """Envia a fila em segundo plano, em ordem, tentando de novo sem rede."""

    def __init__(
        self,
        outbox: Outbox,
        http_client,
        batch_size: int = 100,
        idle_seconds: float = 2,
        min_retry_seconds: float = 5,
        max_retry_seconds: float = 300,
    ):
        self.outbox = outbox
        self.http_client = http_client
        self.batch_size = batch_size
        self.idle_seconds = idle_seconds
        self.min_retry_seconds = min_retry_seconds
        self.max_retry_seconds = max_retry_seconds
        self.retry_seconds = min_retry_seconds
        self.offline = False
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _send(self, item: OutboxItem) -> bool:
        try:
            self.http_client.post(item.path, item.payload)
        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else None

            if status not in _REJECTED_STATUS:
                raise

            logger.error(
                "Server rejected queued item for %s (HTTP %s), discarding it",
                item.path,
                status,
            )

        self.outbox.remove(item.id)
        return True

    def flush(self) -> bool:
        """Envia o que puder. Devolve False se parou por falta de conexão."""
        sent = 0

        while not self._stop.is_set():
            items = self.outbox.peek(self.batch_size)

            if not items:
                break

            for item in items:
                try:
                    self._send(item)
                except Exception as error:
                    if not self.offline:
                        logger.warning(
                            "Server unreachable, keeping %s items queued: %s",
                            self.outbox.count(),
                            error,
                        )
                    self.offline = True
                    return False

                sent += 1

        if self.offline:
            logger.info("Connection restored, sent %s queued items", sent)
            self.offline = False

        return True

    def run_once(self) -> float:
        """Uma volta do envio; devolve quanto tempo esperar até a próxima."""
        self.outbox.prune()

        if self.flush():
            self.retry_seconds = self.min_retry_seconds
            return self.idle_seconds

        wait = self.retry_seconds
        self.retry_seconds = min(self.retry_seconds * 2, self.max_retry_seconds)
        return wait

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                wait = self.run_once()
            except Exception:
                logger.exception("Unexpected error while sending the queue")
                wait = self.max_retry_seconds

            self._stop.wait(wait)

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._loop,
            name="outbox-sender",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

        if self._thread is not None:
            self._thread.join(timeout=15)
            self._thread = None
