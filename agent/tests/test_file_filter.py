import pytest

from src.watchers.file_filter import FileEventFilter


@pytest.mark.parametrize(
    "path",
    [
        "C:\\Users\\maria\\Documents\\~$relatorio.docx",
        "C:\\Users\\maria\\Documents\\~WRL0001.tmp",
        "C:\\Users\\maria\\Downloads\\video.mp4.crdownload",
        "C:\\Users\\maria\\Pictures\\Thumbs.db",
        "C:\\Users\\maria\\Desktop\\desktop.ini",
        "C:\\Users\\maria\\Desktop\\Atalho.lnk",
        "C:/Users/maria/AppData/Local/Temp/arquivo.txt",
        "D:\\Projetos\\site\\node_modules\\pacote\\index.js",
        "D:\\Projetos\\site\\.git\\HEAD",
        "\\\\servidor\\financeiro\\$RECYCLE.BIN\\S-1-5\\a.xlsx",
        "C:\\Users\\maria\\Downloads\\.tmp.driveupload\\280520",
        "C:\\Users\\maria\\Documents\\.tmp.drivedownload\\12\\planilha.xlsx",
    ],
)
def test_ignores_temporary_and_system_files(path):
    assert FileEventFilter().should_ignore(path)


@pytest.mark.parametrize(
    "path",
    [
        "C:\\Users\\maria\\Documents\\relatorio.docx",
        "C:\\Users\\maria\\Downloads\\nota-fiscal.pdf",
        "\\\\servidor\\financeiro\\2026\\balanco.xlsx",
        "D:\\Projetos\\template.docx",
    ],
)
def test_keeps_real_files(path):
    assert not FileEventFilter().should_ignore(path)


def test_matches_case_insensitively():
    assert FileEventFilter().should_ignore("C:/Users/maria/Documents/ARQUIVO.TMP")


def test_accepts_extra_patterns():
    event_filter = FileEventFilter(extra_patterns=["*.bak", "*.log"])

    assert event_filter.should_ignore("D:/Dados/copia.BAK")
    assert event_filter.should_ignore("D:/Dados/servico.log")
    assert not event_filter.should_ignore("D:/Dados/contrato.pdf")


def test_ignores_an_empty_path():
    assert FileEventFilter().should_ignore("")
