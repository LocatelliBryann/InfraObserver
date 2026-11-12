import os
from pathlib import Path

from src.watchers.default_directories import default_monitored_directories


def make_profile(root: Path, name: str, folders: list[str]) -> Path:
    profile = root / name
    profile.mkdir()
    for folder in folders:
        (profile / folder).mkdir()
    return profile

def make_link(link: Path, target: Path) -> None:
    # No Windows, link simbólico exige administrador ou o modo de
    # desenvolvedor; a junção (que é o caso real de C:\Users) não exige.
    if os.name == "nt":
        import _winapi

        _winapi.CreateJunction(str(target), str(link))
        return

    link.symlink_to(target, target_is_directory=True)

def test_windows_lists_the_folders_of_every_user_profile(tmp_path):
    users = tmp_path / "Users"
    users.mkdir()
    make_profile(users, "maria", ["Desktop", "Documents", "Downloads", "Pictures", "Music"])
    make_profile(users, "joao", ["Documents"])
    make_profile(users, "Public", ["Documents"])
    make_profile(users, "Default", ["Desktop"])
    (users / "desktop.ini").write_text("")

    directories = default_monitored_directories(system="Windows", users_root=users)

    assert directories == [
        str(users / "joao" / "Documents"),
        str(users / "maria" / "Desktop"),
        str(users / "maria" / "Documents"),
        str(users / "maria" / "Downloads"),
        str(users / "maria" / "Pictures"),
    ]


def test_windows_without_users_folder_returns_nothing(tmp_path):
    assert default_monitored_directories(
        system="Windows",
        users_root=tmp_path / "nao-existe",
    ) == []


def test_other_systems_use_the_current_home(tmp_path):
    (tmp_path / "Documents").mkdir()
    (tmp_path / "Downloads").mkdir()

    assert default_monitored_directories(system="Linux", home=tmp_path) == [
        str(tmp_path / "Documents"),
        str(tmp_path / "Downloads"),
    ]


def test_windows_skips_links_to_other_folders(tmp_path):
    # No Windows em português, "Todos os Usuários" e "Usuário Padrão" são
    # junções que negam acesso; links e junções nunca são perfis de verdade.
    users = tmp_path / "Users"
    users.mkdir()
    default = make_profile(users, "Default", ["Desktop"])
    make_profile(users, "maria", ["Desktop"])
    make_link(users / "Usuário Padrão", default)
    directories = default_monitored_directories(system="Windows", users_root=users)

    assert directories == [str(users / "maria" / "Desktop")]
