from unittest.mock import Mock, patch

from src.collectors.logged_user import UNKNOWN_USER, get_logged_user


def test_returns_user_from_interactive_session():
    session = Mock()
    session.name = "maria"

    with patch(
        "src.collectors.logged_user.psutil.users",
        return_value=[session],
    ):
        assert get_logged_user() == "maria"


def test_falls_back_to_process_user_when_there_is_no_session():
    with (
        patch("src.collectors.logged_user.psutil.users", return_value=[]),
        patch(
            "src.collectors.logged_user.getpass.getuser",
            return_value="infraobserver",
        ),
    ):
        assert get_logged_user() == "infraobserver"


def test_falls_back_to_process_user_when_psutil_fails():
    with (
        patch(
            "src.collectors.logged_user.psutil.users",
            side_effect=RuntimeError("not supported"),
        ),
        patch(
            "src.collectors.logged_user.getpass.getuser",
            return_value="infraobserver",
        ),
    ):
        assert get_logged_user() == "infraobserver"


def test_returns_unknown_when_no_user_can_be_resolved():
    with (
        patch("src.collectors.logged_user.psutil.users", return_value=[]),
        patch(
            "src.collectors.logged_user.getpass.getuser",
            side_effect=OSError("no user"),
        ),
    ):
        assert get_logged_user() == UNKNOWN_USER
