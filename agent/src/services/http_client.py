import requests


class HttpClient:
    def __init__(self, server_url: str, agent_token: str):
        self.server_url = server_url.rstrip("/")
        self.agent_token = agent_token

    def post(self, path: str, payload: dict):
        url = f"{self.server_url}/{path.lstrip('/')}"

        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.agent_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

        response.raise_for_status()

        return response