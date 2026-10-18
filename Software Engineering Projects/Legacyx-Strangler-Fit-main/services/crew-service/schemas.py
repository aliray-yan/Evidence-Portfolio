import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Same reasoning as services/fleet-service/schemas.py — keeps this
    service's JSON casing consistent with the rest of the platform
    (Java/Jackson, C#/System.Text.Json camelCase) instead of Pydantic's
    snake_case default."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class CrewRole(str, Enum):
    Captain = "Captain"
    FirstOfficer = "FirstOfficer"
    FlightAttendant = "FlightAttendant"


class CrewMemberCreate(CamelModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    role: CrewRole
    medical_clearance_expiry: datetime


class CrewMemberOut(CamelModel):
    crew_id: uuid.UUID
    full_name: str
    role: CrewRole
    medical_clearance_expiry: datetime


class AssignmentCreate(CamelModel):
    flight_id: uuid.UUID
    crew_id: uuid.UUID
    # logged_duty_hours intentionally excluded — always starts at 0 and
    # only ever moves via the FlightDepartedEvent consumer, same
    # mass-assignment fix applied everywhere else in this platform.


class AssignmentOut(CamelModel):
    assignment_id: uuid.UUID
    flight_id: uuid.UUID
    crew_id: uuid.UUID
    logged_duty_hours: Decimal
