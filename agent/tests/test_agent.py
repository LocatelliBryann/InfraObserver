from unittest.mock import Mock, patch

from src.core.agent import Agent


def test_agent_starts_by_registering_endpoint():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
    )

    with patch.object(agent, "run") as mock_run:
        agent.start()

    registration_service.register.assert_called_once_with()
    mock_run.assert_called_once_with()


def test_agent_collects_metrics_after_registration():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
    )

    agent.collect_metrics()

    metrics_service.collect_and_send.assert_called_once_with()


def test_agent_collects_and_sends_metrics():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()
    expected_result = Mock()

    metrics_service.collect_and_send.return_value = expected_result

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
    )

    result = agent.collect_metrics()

    assert result is expected_result
    metrics_service.collect_and_send.assert_called_once_with()


def test_agent_runs_collection_cycle_using_configured_interval():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()
    settings.collection_interval = 60

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
    )

    with patch(
        "src.core.agent.time.sleep",
        side_effect=KeyboardInterrupt,
    ):
        try:
            agent.run()
        except KeyboardInterrupt:
            pass

    metrics_service.collect_and_send.assert_called_once_with()


def test_agent_start_registers_and_runs():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()
    settings.collection_interval = 60

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
    )

    with patch.object(
        agent,
        "run",
        side_effect=KeyboardInterrupt,
    ) as mock_run:
        try:
            agent.start()
        except KeyboardInterrupt:
            pass

    registration_service.register.assert_called_once_with()
    mock_run.assert_called_once_with()

def test_agent_starts_file_observers_before_running():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()
    file_observer_service = Mock()

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
        file_observer_service=file_observer_service,
    )

    with patch.object(agent, "run") as mock_run:
        agent.start()

    file_observer_service.start.assert_called_once_with()
    mock_run.assert_called_once_with()

def test_agent_stops_file_observers():
    registration_service = Mock()
    metrics_service = Mock()
    settings = Mock()
    file_observer_service = Mock()

    agent = Agent(
        registration_service=registration_service,
        metrics_service=metrics_service,
        settings=settings,
        file_observer_service=file_observer_service,
    )

    agent.stop()

    file_observer_service.stop.assert_called_once_with()