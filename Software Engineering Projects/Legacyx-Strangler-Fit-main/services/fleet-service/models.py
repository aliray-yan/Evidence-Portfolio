import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Enum, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class AircraftStatus(str, enum.Enum):
    Active = "Active"
    Grounded = "Grounded"
    InMaintenance = "InMaintenance"


class Aircraft(Base):
    __tablename__ = "aircraft"

    tail_number = Column(String(20), primary_key=True)
    model = Column(String(100), nullable=False)
    max_capacity = Column(Integer, nullable=False)
    status = Column(Enum(AircraftStatus), nullable=False, default=AircraftStatus.Active)


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tail_number = Column(String(20), ForeignKey("aircraft.tail_number"), nullable=False, index=True)
    maintenance_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    action_description = Column(Text, nullable=False)
    cleared_by_inspector_id = Column(String(100), nullable=False)
