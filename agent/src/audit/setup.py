import csv
import io
import json
import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Callable

logger = logging.getLogger(__name__)

# Subcategorias da política de auditoria, pelo GUID (o nome muda com o idioma
# do Windows: "File System" / "Sistema de Arquivos").
FILE_SYSTEM = "{0CCE921D-69AE-11D9-BED3-505054503030}"
DETAILED_FILE_SHARE = "{0CCE9244-69AE-11D9-BED3-505054503030}"
SUBCATEGORIES = (FILE_SYSTEM, DETAILED_FILE_SHARE)

# Bit de "Êxito" no valor da política (0 nada, 1 êxito, 2 falha, 3 ambos).
SUCCESS_BIT = 1

STATE_FILE_NAME = "audit-state.json"
SCRIPT_FILE_NAME = "audit-sacl.ps1"
RESULT_FILE_NAME = "audit-sacl-result.json"
SACL_TIMEOUT_SECONDS = 900
COMMAND_TIMEOUT_SECONDS = 60

# Regra de auditoria (SACL) colocada em cada pasta monitorada: registra,
# para qualquer usuário (Todos, S-1-1-0), quem criou, alterou ou apagou
# arquivos e subpastas. Leitura não é auditada, para não encher o log.
# As pastas vêm por variável de ambiente (JSON), nunca montadas no comando.
SACL_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
# Sem @(): no PowerShell 5.1 o ConvertFrom-Json já devolve a lista, e o @()
# criaria uma lista dentro de outra (o caminho virava um objeto).
$paths = ConvertFrom-Json $env:INFRAOBSERVER_AUDIT_PATHS
$action = $env:INFRAOBSERVER_AUDIT_ACTION
$sid = New-Object System.Security.Principal.SecurityIdentifier('S-1-1-0')
$rights = [System.Security.AccessControl.FileSystemRights]'WriteData, AppendData, Delete, DeleteSubdirectoriesAndFiles'
$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
$rule = New-Object System.Security.AccessControl.FileSystemAuditRule($sid, $rights, $inherit, 'None', 'Success')
$results = @()
foreach ($item in $paths) {
  $path = [string]$item
  try {
    $dir = New-Object System.IO.DirectoryInfo($path)
    $security = $dir.GetAccessControl('Audit')
    $existing = @($security.GetAuditRules($true, $false, [System.Security.Principal.SecurityIdentifier]) | Where-Object {
      $_.IdentityReference -eq $sid -and (($_.FileSystemRights -band $rights) -eq $rights) -and
      $_.InheritanceFlags -eq $inherit -and $_.AuditFlags -eq 'Success'
    })
    if ($action -eq 'add') {
      if ($existing.Count -gt 0) { $results += @{ path = $path; status = 'present' }; continue }
      $security.AddAuditRule($rule)
    } else {
      if ($existing.Count -eq 0) { $results += @{ path = $path; status = 'absent' }; continue }
      [void]$security.RemoveAuditRule($rule)
    }
    $dir.SetAccessControl($security)
    $results += @{ path = $path; status = 'changed' }
  } catch {
    $results += @{ path = $path; status = 'error'; message = $_.Exception.Message }
  }
}
# O resultado vai para um arquivo, não para a saída: no serviço do Windows
# não há console, e mexer na codificação do console falha.
$json = ConvertTo-Json -InputObject @($results) -Compress
[System.IO.File]::WriteAllText($env:INFRAOBSERVER_AUDIT_RESULT, $json, (New-Object System.Text.UTF8Encoding($false)))
"""

Runner = Callable[..., subprocess.CompletedProcess]


def _system_tool(*parts: str) -> str:
    root = os.environ.get("SystemRoot", r"C:\Windows")

    return str(Path(root, "System32", *parts))


def parse_policy_backup(text: str) -> dict[str, int]:
    """Valor de cada subcategoria no CSV do "auditpol /backup"."""
    policy: dict[str, int] = {}

    for row in csv.DictReader(io.StringIO(text)):
        guid = (row.get("Subcategory GUID") or "").strip().upper()
        value = (row.get("Setting Value") or "").strip()

        if guid and value.isdigit():
            policy[guid] = int(value)

    return policy


def _decode(raw: bytes) -> str:
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16")

    return raw.decode("utf-8-sig", errors="replace")


class WindowsAuditConfigurator:
    """Liga a auditoria de arquivos do Windows nas pastas monitoradas.

    Guarda em audit-state.json o que mudou, para a desinstalação desfazer só
    isso (e não uma auditoria que o administrador já tinha configurado).
    """

    def __init__(self, data_directory: Path, run: Runner = subprocess.run):
        self.data_directory = data_directory
        self.state_path = data_directory / STATE_FILE_NAME
        self.run = run

    # ---------- estado ----------

    def load_state(self) -> dict:
        try:
            state = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {"enabledSubcategories": [], "directories": []}

        # Só textos: um valor estranho no arquivo não pode virar um caminho.
        return {
            "enabledSubcategories": [
                item for item in state.get("enabledSubcategories", []) if isinstance(item, str)
            ],
            "directories": [
                item for item in state.get("directories", []) if isinstance(item, str)
            ],
        }

    def save_state(self, state: dict) -> None:
        self.data_directory.mkdir(parents=True, exist_ok=True)
        temporary = self.state_path.with_name(self.state_path.name + ".tmp")
        temporary.write_text(json.dumps(state, indent=2), encoding="utf-8")
        os.replace(temporary, self.state_path)

    # ---------- política (auditpol) ----------

    def read_policy(self) -> dict[str, int]:
        with tempfile.TemporaryDirectory() as directory:
            backup = Path(directory, "policy.csv")
            self.run(
                [_system_tool("auditpol.exe"), "/backup", f"/file:{backup}"],
                capture_output=True,
                timeout=COMMAND_TIMEOUT_SECONDS,
                check=True,
            )

            return parse_policy_backup(_decode(backup.read_bytes()))

    def set_success(self, subcategory: str, enabled: bool) -> None:
        self.run(
            [
                _system_tool("auditpol.exe"),
                "/set",
                f"/subcategory:{subcategory}",
                f"/success:{'enable' if enabled else 'disable'}",
            ],
            capture_output=True,
            timeout=COMMAND_TIMEOUT_SECONDS,
            check=True,
        )

    # ---------- regras nas pastas (SACL) ----------

    def apply_sacl(self, directories: list[str], action: str) -> list[dict]:
        if not directories:
            return []

        script = self.data_directory / SCRIPT_FILE_NAME
        result_file = self.data_directory / RESULT_FILE_NAME
        self.data_directory.mkdir(parents=True, exist_ok=True)
        script.write_text(SACL_SCRIPT, encoding="utf-8-sig")

        try:
            result_file.unlink()
        except OSError:
            pass

        env = {
            **os.environ,
            "INFRAOBSERVER_AUDIT_PATHS": json.dumps(directories),
            "INFRAOBSERVER_AUDIT_ACTION": action,
            "INFRAOBSERVER_AUDIT_RESULT": str(result_file),
        }
        completed = self.run(
            [
                _system_tool("WindowsPowerShell", "v1.0", "powershell.exe"),
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
            ],
            capture_output=True,
            timeout=SACL_TIMEOUT_SECONDS,
            check=False,
            env=env,
        )

        if completed.returncode != 0 or not result_file.exists():
            errors = _decode(completed.stderr or b"").strip()
            raise RuntimeError(
                f"PowerShell failed with code {completed.returncode}: {errors[-2000:]}"
            )

        output = _decode(result_file.read_bytes()).strip()
        result_file.unlink()
        results = json.loads(output) if output else []

        if not isinstance(results, list):
            results = [results]

        # Vale só o resultado de uma pasta pedida, com o caminho como texto.
        return [
            item
            for item in results
            if isinstance(item, dict)
            and isinstance(item.get("path"), str)
            and item["path"] in directories
        ]

    # ---------- ligar / desfazer ----------

    def enable(self, directories: list[str]) -> list[str]:
        """Liga a auditoria; devolve as pastas com a regra no lugar."""
        state = self.load_state()
        policy = self.read_policy()

        for subcategory in SUBCATEGORIES:
            if policy.get(subcategory, 0) & SUCCESS_BIT:
                continue

            self.set_success(subcategory, True)

            if subcategory not in state["enabledSubcategories"]:
                state["enabledSubcategories"].append(subcategory)

        audited = []

        for item in self.apply_sacl(directories, "add"):
            path = item.get("path")
            status = item.get("status")

            if status == "changed" and path not in state["directories"]:
                state["directories"].append(path)

            if status in ("changed", "present"):
                audited.append(path)
            else:
                logger.warning(
                    "Could not enable file auditing on %s: %s",
                    path,
                    item.get("message"),
                )

        self.save_state(state)

        return audited

    def disable(self) -> bool:
        """Desfaz o que o agente ligou (usado na desinstalação).

        Cada passo segue mesmo se outro falhar. Devolve False se algo ficou
        para trás; nesse caso o audit-state.json fica, com o que faltou.
        """
        state = self.load_state()
        remaining_directories: list[str] = []
        remaining_subcategories: list[str] = []

        try:
            results = self.apply_sacl(state["directories"], "remove")
        except Exception:
            logger.exception("Could not run the script that removes file auditing")
            results = [{"path": path, "status": "error"} for path in state["directories"]]

        for item in results:
            logger.info("File auditing on %s: %s", item.get("path"), item.get("status"))

            if item.get("status") == "error":
                remaining_directories.append(item.get("path"))
                logger.warning(
                    "Could not remove file auditing from %s: %s",
                    item.get("path"),
                    item.get("message"),
                )

        for subcategory in state["enabledSubcategories"]:
            try:
                self.set_success(subcategory, False)
            except (OSError, subprocess.SubprocessError):
                remaining_subcategories.append(subcategory)
                logger.exception("Could not restore audit policy %s", subcategory)

        if remaining_directories or remaining_subcategories:
            self.save_state(
                {
                    "enabledSubcategories": remaining_subcategories,
                    "directories": remaining_directories,
                }
            )
            return False

        try:
            self.state_path.unlink()
        except OSError:
            pass

        return True
