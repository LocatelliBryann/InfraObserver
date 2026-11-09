import importlib
import sys
import types

import src.version


def test_version_defaults_to_dev_when_running_from_source():
    assert importlib.reload(src.version).__version__ == "0.0.0-dev"


def test_version_comes_from_installer_build(monkeypatch):
    build_info = types.ModuleType("src._build_info")
    build_info.VERSION = "1.5.0"
    monkeypatch.setitem(sys.modules, "src._build_info", build_info)

    assert importlib.reload(src.version).__version__ == "1.5.0"

    monkeypatch.delitem(sys.modules, "src._build_info")
    importlib.reload(src.version)
