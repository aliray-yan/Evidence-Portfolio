import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Every other service in this platform (Java/Jackson, C#/System.Text.Json
    with a camelCase policy) serializes camelCase — Pydantic defaults to the
    Python field names (snake_case) unless told otherwise. One base class
    with Pydantic's built-in alias generator keeps this service's API
    surface consistent with the rest of the platform for free."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class AircraftStatus(str, Enum):
    Active = "Active"
    Grounded = "Grounded"
    InMaintenance = "InMaintenance"


class AircraftCreate(CamelModel):
    tail_number: str = Field(..., min_length=1, max_length=20)
    model: str = Field(..., min_length=1, max_length=100)
    max_capacity: int = Field(..., gt=0)
    # status intentionally excluded — always starts Active server-side.
    # Client-settable status at creation is the same mass-assignment
    # class of bug fixed everywhere else in this platform.


class AircraftOut(CamelModel):
    tail_number: str
    model: str
    max_capacity: int
    status: AircraftStatus


class AircraftStatusUpdate(CamelModel):
    status: AircraftStatus


class MaintenanceLogCreate(CamelModel):
    tail_number: str = Field(..., min_length=1, max_length=20)
    action_description: str = Field(..., min_length=1, max_length=2000)
    cleared_by_inspector_id: str = Field(..., min_length=1, max_length=100)


class MaintenanceLogOut(CamelModel):
    log_id: uuid.UUID
    tail_number: str
    maintenance_date: datetime
    action_description: str
    cleared_by_inspector_id: str
