import enum
import uuid

from sqlalchemy import Column, String, Numeric, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class CrewRole(str, enum.Enum):
    Captain = "Captain"
    FirstOfficer = "FirstOfficer"
    FlightAttendant = "FlightAttendant"


class CrewMember(Base):
    __tablename__ = "crew_members"

    crew_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    role = Column(Enum(CrewRole), nullable=False)
    medical_clearance_expiry = Column(DateTime(timezone=True), nullable=False)


class FlightAssignment(Base):
    __tablename__ = "flight_assignments"

    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    crew_id = Column(UUID(as_uuid=True), ForeignKey("crew_members.crew_id"), nullable=False, index=True)
    logged_duty_hours = Column(Numeric(6, 2), nullable=False, default=0)
