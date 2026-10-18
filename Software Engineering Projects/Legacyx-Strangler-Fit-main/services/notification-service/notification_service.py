#!/usr/bin/env python3
"""
Consumes OrderCreated events from Kafka and simulates sending a
notification. No real email/SMS provider is contacted — logs only,
same convention as the legacy monolith's own Notifications endpoint.

handle_event() is deliberately separate from main()/the Kafka
connection, so the actual business logic can be tested without a
live broker — see test_handle_event.py.
"""

import json
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("notification-service")

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
TOPIC = os.environ.get("KAFKA_TOPIC", "legacyx.orders")
MAX_MESSAGE_BYTES = 1_000_000  # defense in depth against an adversarial/malformed oversized message


def handle_event(envelope: dict) -> None:
    """The actual business logic. Given a decoded event envelope
    (see docs/architecture/event-architecture.md), decide what to do."""
    if envelope.get("eventType") != "OrderCreated":
        log.info("Ignoring event type %s", envelope.get("eventType"))
        return

    data = envelope["data"]
    log.info(
        "[SIMULATED NOTIFICATION] customerNo=%s orderNo=%s totalAmount=%s "
        "— 'Your order %s has been placed.'",
        data["customerNo"], data["orderNo"], data["totalAmount"], data["orderNo"],
    )


def main() -> None:
    from confluent_kafka import Consumer  # imported here so handle_event() and
                                            # its tests don't require this
                                            # to even be installed

    consumer = Consumer({
        "bootstrap.servers": BOOTSTRAP_SERVERS,
        "group.id": "notification-service",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([TOPIC])
    log.info("Listening on topic '%s' at %s", TOPIC, BOOTSTRAP_SERVERS)

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                log.warning("Consumer error: %s", msg.error())
                continue
            if len(msg.value()) > MAX_MESSAGE_BYTES:
                log.warning("Message at offset %s exceeds %d bytes, skipping", msg.offset(), MAX_MESSAGE_BYTES)
                continue
            try:
                handle_event(json.loads(msg.value().decode("utf-8")))
            except Exception:
                log.exception("Failed to handle message at offset %s", msg.offset())
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
