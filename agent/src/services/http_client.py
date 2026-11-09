import requests


class HttpClient:
    def __init__(self, server_url: str, agent_token: str):
        self.server_url = server_url.rstrip("/")
        self.agent_token = agent_token

    def _url(self, path: str) -> str:
        return f"{self.server_url}/{path.lstrip('/')}"

    def post(self, path: str, payload: dict):
        response = requests.post(
            self._url(path),
            json=payload,
            headers={
                "Authorization": f"Bearer {self.agent_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

        response.raise_for_status()

        return response

    def get(self, path: str):
        response = requests.get(
            self._url(path),
            headers={"Authorization": f"Bearer {self.agent_token}"},
            timeout=10,
        )

        response.raise_for_status()

        return response