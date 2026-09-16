from unittest.mock import Mock

from src.core.agent import Agent


def test_agent_starts_by_registering_endpoint():
    registration_service = Mock()

    agent = Agent(
        registration_service=registration_service,
    )

    agent.start()

    registration_service.register.assert_called_once_with()