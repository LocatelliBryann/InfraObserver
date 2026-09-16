import pytest
import requests
from unittest.mock import Mock, patch

from src.services.http_client import HttpClient


def test_http_client_sends_post_request_with_bearer_token():
    client = HttpClient(
        server_url="http://localhost:3000",
        agent_token="test-token",
    )

    payload = {
        "agentId": "550e8400-e29b-41d4-a716-446655440000",
    }

    with patch("src.services.http_client.requests.post") as mock_post:
        response = Mock()
        response.raise_for_status.return_value = None
        mock_post.return_value = response

        client.post("/api/v1/endpoints/register", payload)

        mock_post.assert_called_once_with(
            "http://localhost:3000/api/v1/endpoints/register",
            json=payload,
            headers={
                "Authorization": "Bearer test-token",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

def test_http_client_raises_when_server_returns_http_error():
    client = HttpClient(
        server_url="http://localhost:3000",
        agent_token="test-token",
    )

    with patch("src.services.http_client.requests.post") as mock_post:
        response = Mock()
        response.raise_for_status.side_effect = requests.HTTPError("Server error")
        mock_post.return_value = response

        with pytest.raises(requests.HTTPError, match="Server error"):
            client.post(
                "/api/v1/endpoints/register",
                {"agentId": "550e8400-e29b-41d4-a716-446655440000"},
            )