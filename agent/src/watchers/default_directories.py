import os
import platform
from pathlib import Path

# Pastas de cada usuário monitoradas quando nenhuma é configurada.
USER_FOLDERS = ("Desktop", "Documents", "Downloads", "Pictures")

# Perfis do Windows que não são de pessoas. Os atalhos antigos com nome
# traduzido ("Todos os Usuários", "Usuário Padrão") são junções e ficam de
# fora em _is_user_profile.
SYSTEM_PROFILES = frozenset(
    {"default", "default user", "public", "all users", "defaultapppool"}
)


def _is_user_profile(path: Path) -> bool:
    # Junções e links simbólicos em C:\Users apontam para outras pastas e
    # negam a listagem até para o sistema (WinError 5).
    if path.is_symlink() or path.is_junction():
        return False

    return path.is_dir() and path.name.lower() not in SYSTEM_PROFILES


def default_monitored_directories(
    system: str | None = None,
    users_root: Path | None = None,
    home: Path | None = None,
) -> list[str]:
    """Pastas do usuário (Área de Trabalho, Documentos, Downloads e Imagens).

    No Windows o agente roda como serviço, com a conta do sistema, então lista
    as pastas de todos os perfis em C:\\Users. Fora do Windows (desenvolvimento),
    usa a pasta do usuário atual.
    """
    system = system or platform.system()

    if system == "Windows":
        root = users_root or Path(os.environ.get("SystemDrive", "C:") + "\\") / "Users"
        profiles = (
            [
                profile
                for profile in sorted(root.iterdir())
                if _is_user_profile(profile)
            ]
            if root.is_dir()
            else []
        )
    else:
        profiles = [home or Path.home()]

    return [
        str(profile / folder)
        for profile in profiles
        for folder in USER_FOLDERS
        if (profile / folder).is_dir()
    ]
