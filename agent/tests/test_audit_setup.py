import json
import subprocess
from pathlib import Path

import pytest

from src.audit.setup import (
    DETAILED_FILE_SHARE,
    FILE_SYSTEM,
    SACL_SCRIPT,
    WindowsAuditConfigurator,
    parse_policy_backup,
)

BACKUP_HEADER = (
    "Machine Name,Policy Target,Subcategory,Subcategory GUID,"
    "Inclusion Setting,Exclusion Setting,Setting Value\n"
)


def backup_csv(file_system: int, file_share: int) -> str:
    return (
        BACKUP_HEADER
        + f"PC,System,Sistema de Arquivos,{FILE_SYSTEM},Sem Auditoria,,{file_system}\n"
        + f"PC,System,Compartilhamento,{DETAILED_FILE_SHARE},Êxito,,{file_share}\n"
        + "PC,System,Option:CrashOnAuditFail,,Disabled,,0\n"
    )


class FakeWindows:
    """Simula auditpol e PowerShell, guardando os comandos."""

    def __init__(self, policy=(0, 0), sacl_status="changed", encoding="utf-16"):
        self.policy = {FILE_SYSTEM: policy[0], DETAILED_FILE_SHARE: policy[1]}
        self.sacl_status = sacl_status
        self.encoding = encoding
        self.powershell_fails = False
        self.calls = []

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        tool = Path(args[0]).name.lower()

        if tool == "auditpol.exe" and args[1] == "/backup":
            target = Path(args[2].removeprefix("/file:"))
            content = backup_csv(self.policy[FILE_SYSTEM], self.policy[DETAILED_FILE_SHARE])
            target.write_bytes(content.encode(self.encoding))
            return subprocess.CompletedProcess(args, 0, b"", b"")

        if tool == "auditpol.exe" and args[1] == "/set":
            guid = args[2].removeprefix("/subcategory:")
            enabled = args[3] == "/success:enable"
            self.policy[guid] = (self.policy[guid] | 1) if enabled else (self.policy[guid] & ~1)
            return subprocess.CompletedProcess(args, 0, b"", b"")

        if tool == "powershell.exe":
            paths = json.loads(kwargs["env"]["INFRAOBSERVER_AUDIT_PATHS"])
            status = self.sacl_status
            output = [
                {"path": path, "status": status(path) if callable(status) else status}
                for path in paths
            ]
            if self.powershell_fails:
                return subprocess.CompletedProcess(args, 1, b"", "Acesso negado".encode("utf-8"))
            Path(kwargs["env"]["INFRAOBSERVER_AUDIT_RESULT"]).write_text(
                json.dumps(output), encoding="utf-8"
            )
            return subprocess.CompletedProcess(args, 0, b"", b"")

        raise AssertionError(f"comando inesperado: {args}")

    def commands(self, tool):
        return [args for args, _ in self.calls if Path(args[0]).name.lower() == tool]


def test_parse_policy_backup():
    assert parse_policy_backup(backup_csv(0, 3)) == {FILE_SYSTEM: 0, DETAILED_FILE_SHARE: 3}
    assert parse_policy_backup("") == {}


def test_enable_turns_on_the_policy_and_the_folder_rules(tmp_path):
    windows = FakeWindows(policy=(0, 0))
    configurator = WindowsAuditConfigurator(tmp_path, run=windows)

    audited = configurator.enable([r"C:\Users\maria\Documents", r"C:\Área de Trabalho"])

    assert audited == [r"C:\Users\maria\Documents", r"C:\Área de Trabalho"]
    assert windows.policy == {FILE_SYSTEM: 1, DETAILED_FILE_SHARE: 1}
    state = configurator.load_state()
    assert state == {
        "enabledSubcategories": [FILE_SYSTEM, DETAILED_FILE_SHARE],
        "directories": [r"C:\Users\maria\Documents", r"C:\Área de Trabalho"],
    }
    assert (tmp_path / "audit-sacl.ps1").read_text(encoding="utf-8-sig") == SACL_SCRIPT


def test_paths_go_by_environment_never_in_the_command(tmp_path):
    windows = FakeWindows()
    WindowsAuditConfigurator(tmp_path, run=windows).enable([r"C:\pasta'; Remove-Item C:\ -Recurse"])

    (command,) = windows.commands("powershell.exe")
    assert not any("Remove-Item" in part for part in command)
    assert command[-2:] == ["-File", str(tmp_path / "audit-sacl.ps1")]


def test_enable_keeps_what_the_administrator_already_had(tmp_path):
    windows = FakeWindows(policy=(3, 1), sacl_status="present")
    configurator = WindowsAuditConfigurator(tmp_path, run=windows)

    audited = configurator.enable([r"C:\pasta"])

    assert audited == [r"C:\pasta"]
    assert len(windows.commands("auditpol.exe")) == 1  # só o /backup
    assert configurator.load_state() == {"enabledSubcategories": [], "directories": []}


def test_enable_skips_folders_with_errors(tmp_path, caplog):
    windows = FakeWindows(sacl_status=lambda path: "error" if "rede" in path else "changed")

    audited = WindowsAuditConfigurator(tmp_path, run=windows).enable([r"\\servidor\rede", r"C:\local"])

    assert audited == [r"C:\local"]
    assert "Could not enable file auditing" in caplog.text


def test_enable_twice_does_not_duplicate_the_state(tmp_path):
    windows = FakeWindows()
    configurator = WindowsAuditConfigurator(tmp_path, run=windows)

    configurator.enable([r"C:\pasta"])
    configurator.enable([r"C:\pasta"])

    assert configurator.load_state()["directories"] == [r"C:\pasta"]
    assert configurator.load_state()["enabledSubcategories"] == [FILE_SYSTEM, DETAILED_FILE_SHARE]


def test_disable_undoes_only_what_the_agent_changed(tmp_path):
    windows = FakeWindows(policy=(0, 1))
    configurator = WindowsAuditConfigurator(tmp_path, run=windows)
    configurator.enable([r"C:\pasta"])
    windows.calls.clear()

    configurator.disable()

    (sacl,) = windows.commands("powershell.exe")
    removal_env = [kwargs["env"] for args, kwargs in windows.calls if args == sacl][0]
    assert removal_env["INFRAOBSERVER_AUDIT_ACTION"] == "remove"
    assert json.loads(removal_env["INFRAOBSERVER_AUDIT_PATHS"]) == [r"C:\pasta"]
    # A subcategoria que já estava ligada continua ligada.
    assert windows.policy == {FILE_SYSTEM: 0, DETAILED_FILE_SHARE: 1}
    assert not (tmp_path / "audit-state.json").exists()


def test_disable_without_state_does_nothing(tmp_path):
    windows = FakeWindows()

    WindowsAuditConfigurator(tmp_path, run=windows).disable()

    assert windows.calls == []


def test_disable_keeps_going_when_a_step_fails(tmp_path, caplog):
    configurator = WindowsAuditConfigurator(tmp_path, run=FakeWindows(sacl_status="error"))
    configurator.save_state({"enabledSubcategories": [FILE_SYSTEM], "directories": [r"C:\pasta"]})

    def failing(args, **kwargs):
        if Path(args[0]).name.lower() == "auditpol.exe":
            raise subprocess.CalledProcessError(1, args)
        return FakeWindows(sacl_status="error")(args, **kwargs)

    configurator.run = failing
    configurator.disable()

    assert "Could not remove file auditing" in caplog.text
    assert "Could not restore audit policy" in caplog.text


def test_reads_a_utf8_backup_and_a_corrupted_state(tmp_path):
    configurator = WindowsAuditConfigurator(tmp_path, run=FakeWindows(policy=(1, 1), encoding="utf-8"))
    (tmp_path / "audit-state.json").write_text("{quebrado", encoding="utf-8")

    assert configurator.read_policy() == {FILE_SYSTEM: 1, DETAILED_FILE_SHARE: 1}
    assert configurator.load_state() == {"enabledSubcategories": [], "directories": []}


def test_no_command_for_an_empty_folder_list(tmp_path):
    windows = FakeWindows()

    assert WindowsAuditConfigurator(tmp_path, run=windows).apply_sacl([], "add") == []
    assert windows.commands("powershell.exe") == []


def test_powershell_failure_is_reported_with_its_error(tmp_path):
    windows = FakeWindows()
    windows.powershell_fails = True

    with pytest.raises(RuntimeError, match="Acesso negado"):
        WindowsAuditConfigurator(tmp_path, run=windows).apply_sacl([r"C:\pasta"], "add")


def test_the_result_file_is_removed_after_reading(tmp_path):
    WindowsAuditConfigurator(tmp_path, run=FakeWindows()).apply_sacl([r"C:\pasta"], "add")

    assert not (tmp_path / "audit-sacl-result.json").exists()


def test_script_does_not_touch_the_console_encoding():
    assert "Console" not in SACL_SCRIPT
    assert "INFRAOBSERVER_AUDIT_RESULT" in SACL_SCRIPT
