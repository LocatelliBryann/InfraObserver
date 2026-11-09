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


def test_agent_stops_file_observers_when_run_is_interrupted():
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

    with patch.object(
        agent,
        "run",
        side_effect=KeyboardInterrupt,
    ):
        try:
            agent.start()
        except KeyboardInterrupt:
            pass

    file_observer_service.stop.assert_called_once_with()

def test_agent_run_cycle_does_not_raise_when_sending_fails():
    metrics_service = Mock()
    metrics_service.collect_and_send.side_effect = ConnectionError(
        "server unavailable",
    )

    agent = Agent(
        registration_service=Mock(),
        metrics_service=metrics_service,
        settings=Mock(),
    )

    assert agent.run_cycle() is False


def test_agent_keeps_running_after_a_failed_cycle():
    metrics_service = Mock()
    metrics_service.collect_and_send.side_effect = [
        ConnectionError("server unavailable"),
        None,
    ]
    settings = Mock()
    settings.collection_interval = 60

    agent = Agent(
        registration_service=Mock(),
        metrics_service=metrics_service,
        settings=settings,
    )

    with patch(
        "src.core.agent.time.sleep",
        side_effect=[None, KeyboardInterrupt],
    ):
        try:
            agent.run()
        except KeyboardInterrupt:
            pass

    assert metrics_service.collect_and_send.call_count == 2


def test_agent_retries_registration_until_server_is_available():
    registration_service = Mock()
    registration_service.register.side_effect = [
        ConnectionError("server unavailable"),
        "registered",
    ]
    settings = Mock()
    settings.collection_interval = 60

    agent = Agent(
        registration_service=registration_service,
        metrics_service=Mock(),
        settings=settings,
    )

    with patch("src.core.agent.time.sleep") as mock_sleep:
        result = agent.register_with_retry()

    assert result == "registered"
    assert registration_service.register.call_count == 2
    mock_sleep.assert_called_once_with(60)


def test_agent_checks_for_updates_after_sending_metrics():
    update_service = Mock()
    agent = Agent(
        registration_service=Mock(),
        metrics_service=Mock(),
        settings=Mock(),
        update_service=update_service,
    )

    assert agent.run_cycle() is True

    update_service.check_if_due.assert_called_once_with()


def test_agent_skips_update_check_when_metrics_fail():
    update_service = Mock()
    metrics_service = Mock()
    metrics_service.collect_and_send.side_effect = RuntimeError("offline")
    agent = Agent(
        registration_service=Mock(),
        metrics_service=metrics_service,
        settings=Mock(),
        update_service=update_service,
    )

    assert agent.run_cycle() is False

    update_service.check_if_due.assert_not_called()


def test_agent_with_queue_watches_folders_before_the_server_answers():
    calls = []
    registration_service = Mock()
    registration_service.register.side_effect = lambda: calls.append("register")
    file_observer_service = Mock()
    file_observer_service.start.side_effect = lambda: calls.append("watch")
    outbox_sender = Mock()
    outbox_sender.start.side_effect = lambda: calls.append("send queue")

    agent = Agent(
        registration_service=registration_service,
        metrics_service=Mock(),
        settings=Mock(),
        file_observer_service=file_observer_service,
        outbox_sender=outbox_sender,
    )

    with patch.object(agent, "run"):
        agent.start()

    assert calls == ["watch", "register", "send queue"]
    file_observer_service.stop.assert_called_once_with()
    outbox_sender.stop.assert_called_once_with()
