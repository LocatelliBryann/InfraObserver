from pathlib import Path

from src.watchers.default_directories import default_monitored_directories


def make_profile(root: Path, name: str, folders: list[str]) -> Path:
    profile = root / name
    profile.mkdir()
    for folder in folders:
        (profile / folder).mkdir()
    return profile


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
