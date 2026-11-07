# Versão do agente. O build do instalador (packaging/windows/build.ps1) gera o
# src/_build_info.py com a versão da release; rodando do código, fica "dev".
try:
    from src._build_info import VERSION as __version__
except ImportError:
    __version__ = "0.0.0-dev"
