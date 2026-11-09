from fnmatch import fnmatch
from pathlib import PureWindowsPath

# Arquivos temporários e de sistema criados o tempo todo pelo Windows e pelos
# programas (Office, navegadores, editores). Não são ações do usuário.
DEFAULT_IGNORED_FILE_PATTERNS = (
    "~$*",
    "~*.tmp",
    ".~lock.*",
    "*.tmp",
    "*.temp",
    "*.crdownload",
    "*.part",
    "*.partial",
    "*.swp",
    "*.lnk",
    "thumbs.db",
    "desktop.ini",
    ".ds_store",
)

# Pastas internas que geram muito ruído e não interessam para auditoria.
DEFAULT_IGNORED_DIRECTORY_NAMES = (
    "appdata",
    "$recycle.bin",
    "system volume information",
    ".git",
    "node_modules",
    "__pycache__",
    # Google Drive para computador: cópias temporárias durante o envio e o download.
    ".tmp.driveupload",
    ".tmp.drivedownload",
)


class FileEventFilter:
    """Decide quais caminhos não devem virar evento."""

    def __init__(
        self,
        extra_patterns: list[str] | None = None,
        ignored_file_patterns: tuple[str, ...] = DEFAULT_IGNORED_FILE_PATTERNS,
        ignored_directory_names: tuple[str, ...] = DEFAULT_IGNORED_DIRECTORY_NAMES,
    ):
        self.file_patterns = tuple(
            pattern.lower()
            for pattern in (*ignored_file_patterns, *(extra_patterns or []))
        )
        self.directory_names = frozenset(
            name.lower() for name in ignored_directory_names
        )

    def should_ignore(self, path: str) -> bool:
        # PureWindowsPath entende tanto "\" quanto "/" como separador.
        parts = [part.lower() for part in PureWindowsPath(path).parts]

        if not parts:
            return True

        if any(part in self.directory_names for part in parts[:-1]):
            return True

        name = parts[-1]

        if name in self.directory_names:
            return True

        return any(fnmatch(name, pattern) for pattern in self.file_patterns)
