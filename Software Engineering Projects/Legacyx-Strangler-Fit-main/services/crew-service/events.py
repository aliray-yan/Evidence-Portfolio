import json
import logging
import os
import threading
import uuid
from decimal import Decimal

from database import SessionLocal
from models import FlightAssignment

log = logging.getLogger("crew-service")

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
TOPIC = "legacyx.aviation.flights"
# Flat per-departure increment — a real system would compute actual
# block time from route distance and aircraft speed; this is enough to
# demonstrate the event-driven wiring the spec asks for without needing
# a full flight-time simulation.
DUTY_HOURS_PER_LEG = Decimal("1.5")


def handle_event(envelope: dict, db) -> None:
    """Business logic, separated from the Kafka connection so it's
    testable without a live broker — same pattern as
    notification-service/notification_service.py."""
    if envelope.get("eventType") != "FlightDepartedEvent":
        log.info("Ignoring event type %s", envelope.get("eventType"))
        return

    flight_id = uuid.UUID(envelope["data"]["flightId"])
    assignments = db.query(FlightAssignment).filter(FlightAssignment.flight_id == flight_id).all()
    if not assignments:
        log.warning("FlightDepartedEvent for flight_id=%s has no crew assignments to update", flight_id)
        return

    for assignment in assignments:
        assignment.logged_duty_hours = (assignment.logged_duty_hours or Decimal("0")) + DUTY_HOURS_PER_LEG
    db.commit()
    log.info("Logged %s duty hours for %d assignment(s) on flight %s", DUTY_HOURS_PER_LEG, len(assignments), flight_id)


def _consume_loop() -> None:
    from confluent_kafka import Consumer  # imported here so handle_event() and its tests don't require a broker

    consumer = Consumer({
        "bootstrap.servers": BOOTSTRAP_SERVERS,
        "group.id": "crew-service",
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
            db = SessionLocal()
            try:
                handle_event(json.loads(msg.value().decode("utf-8")), db)
            except Exception:
                log.exception("Failed to handle message at offset %s", msg.offset())
            finally:
                db.close()
    finally:
        consumer.close()


def start_consumer_thread() -> None:
    # FastAPI's event loop is async; confluent-kafka's Consumer is
    # blocking/sync, so it gets its own daemon thread rather than
    # fighting the request-handling loop for the process.
    threading.Thread(target=_consume_loop, daemon=True).start()
