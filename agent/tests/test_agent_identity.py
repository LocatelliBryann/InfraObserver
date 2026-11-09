from uuid import UUID

from src.config.agent_identity import ensure_agent_id

AGENT_ID = "6a1f0c2e-2222-4a5b-8c9d-000000000001"


def test_keeps_configured_agent_id(tmp_path):
    environ = {"INFRAOBSERVER_AGENT_ID": AGENT_ID}
    id_file = tmp_path / "agent-id"

    ensure_agent_id(environ, id_file)

    assert environ["INFRAOBSERVER_AGENT_ID"] == AGENT_ID
    assert not id_file.exists()


def test_generates_and_saves_agent_id_on_first_run(tmp_path):
    environ = {}
    id_file = tmp_path / "InfraObserver" / "agent-id"

    ensure_agent_id(environ, id_file)

    generated = environ["INFRAOBSERVER_AGENT_ID"]
    assert UUID(generated)
    assert id_file.read_text(encoding="utf-8").strip() == generated


def test_reuses_saved_agent_id(tmp_path):
    id_file = tmp_path / "agent-id"
    id_file.write_text(AGENT_ID + "\n", encoding="utf-8")
    environ = {}

    ensure_agent_id(environ, id_file)

    assert environ["INFRAOBSERVER_AGENT_ID"] == AGENT_ID


def test_replaces_invalid_saved_agent_id(tmp_path, caplog):
    id_file = tmp_path / "agent-id"
    id_file.write_text("not-a-uuid", encoding="utf-8")
    environ = {}

    ensure_agent_id(environ, id_file)

    generated = environ["INFRAOBSERVER_AGENT_ID"]
    assert generated != "not-a-uuid"
    assert id_file.read_text(encoding="utf-8").strip() == generated
    assert "Invalid agent id" in caplog.text


def test_does_nothing_without_id_file():
    environ = {}

    ensure_agent_id(environ, None)

    assert "INFRAOBSERVER_AGENT_ID" not in environ
