"""pytest for events.handle_event() — no Kafka broker needed, same
pattern as services/notification-service/tests/test_handle_event.py.
Needs a reachable Postgres (CREW_DB env vars) since handle_event queries
FlightAssignment rows directly; run inside the crew-db container or via
`docker compose run`.
"""

import os
import sys
import uuid
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine, SessionLocal
from models import CrewMember, FlightAssignment, CrewRole
from events import handle_event, DUTY_HOURS_PER_LEG


def _fresh_db():
    Base.metadata.create_all(bind=engine)
    return SessionLocal()


def test_flight_departed_increments_logged_duty_hours():
    db = _fresh_db()
    crew = CrewMember(full_name="Test Pilot", role=CrewRole.Captain, medical_clearance_expiry="2030-01-01")
    db.add(crew)
    db.commit()

    flight_id = uuid.uuid4()
    assignment = FlightAssignment(flight_id=flight_id, crew_id=crew.crew_id, logged_duty_hours=Decimal("2.0"))
    db.add(assignment)
    db.commit()

    envelope = {"eventType": "FlightDepartedEvent", "data": {"flightId": str(flight_id)}}
    handle_event(envelope, db)

    db.refresh(assignment)
    assert assignment.logged_duty_hours == Decimal("2.0") + DUTY_HOURS_PER_LEG


def test_unrelated_event_type_is_ignored():
    db = _fresh_db()
    # Should not raise even with no matching assignment — handled before
    # any query runs.
    handle_event({"eventType": "SomethingElse", "data": {}}, db)
