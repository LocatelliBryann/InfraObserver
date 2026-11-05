import getpass

import psutil

UNKNOWN_USER = "unknown"


def get_logged_user() -> str:
    """Retorna o usuário com sessão aberta no endpoint.

    Prioriza a sessão interativa (psutil.users), porque o agente pode rodar
    como serviço com uma conta de sistema. Se não houver sessão, usa o
    usuário do processo do agente.
    """
    try:
        sessions = psutil.users()
    except Exception:
        sessions = []

    for session in sessions:
        if session.name:
            return session.name

    try:
        username = getpass.getuser()
    except Exception:
        return UNKNOWN_USER

    return username or UNKNOWN_USER
