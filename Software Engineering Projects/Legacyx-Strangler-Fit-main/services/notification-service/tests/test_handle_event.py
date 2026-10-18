"""
pytest tests for handle_event() — no Kafka broker needed. This is the
part of notification-service that's actually verified in the sandbox
that wrote it; the broker connection itself needs Docker (see
../../MANUAL.md).
Run: pytest tests/test_handle_event.py -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from notification_service import handle_event

SAMPLE_ORDER_CREATED = {
    "eventId": "test-1234",
    "eventType": "OrderCreated",
    "timestamp": "2026-08-14T12:00:00Z",
    "correlationId": "corr-5678",
    "source": "order-service",
    "version": 1,
    "data": {
        "orderId": 1,
        "orderNo": "O20260814120000000",
        "customerNo": "C001",
        "totalAmount": 49.48,
        "items": [{"sku": "SKU-001", "quantity": 2, "unitPrice": 19.99}],
    },
}


def test_order_created_logs_simulated_notification(caplog):
    with caplog.at_level("INFO"):
        handle_event(SAMPLE_ORDER_CREATED)
    assert "SIMULATED NOTIFICATION" in caplog.text
    assert "C001" in caplog.text
    assert "O20260814120000000" in caplog.text


def test_unrelated_event_type_is_ignored(caplog):
    with caplog.at_level("INFO"):
        handle_event({"eventType": "SomethingElse", "data": {}})
    assert "SIMULATED NOTIFICATION" not in caplog.text
    assert "Ignoring event type SomethingElse" in caplog.text


def test_malformed_event_raises_rather_than_silently_passing():
    # Missing "data" entirely. main()'s try/except is what catches this
    # in production — confirmed here that it actually raises rather than
    # silently doing nothing, which would be worse: a lost notification
    # with no trace at all.
    with pytest.raises(KeyError):
        handle_event({"eventType": "OrderCreated"})
