from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.helpers import now_utc


class StepType(StrEnum):
    MANUAL = "manual"
    AUTOMATED = "automated"
    DECISION = "decision"


class ExecutionStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class StepExecutionStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class Playbook(Base):
    __tablename__ = "playbooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    trigger_conditions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    created_by = relationship("User")
    steps: Mapped[list["PlaybookStep"]] = relationship(back_populates="playbook", cascade="all, delete-orphan", order_by="PlaybookStep.step_number")


class PlaybookStep(Base):
    __tablename__ = "playbook_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    playbook_id: Mapped[str] = mapped_column(ForeignKey("playbooks.id", ondelete="CASCADE"), index=True, nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    step_type: Mapped[StepType] = mapped_column(Enum(StepType), default=StepType.MANUAL, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    automation_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    expected_duration_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    parent_step_id: Mapped[str | None] = mapped_column(ForeignKey("playbook_steps.id", ondelete="SET NULL"), nullable=True)
    branch_condition: Mapped[str | None] = mapped_column(String(255), nullable=True)

    playbook: Mapped[Playbook] = relationship(back_populates="steps", foreign_keys=[playbook_id])


class PlaybookExecution(Base):
    __tablename__ = "playbook_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    playbook_id: Mapped[str] = mapped_column(ForeignKey("playbooks.id", ondelete="CASCADE"), index=True, nullable=False)
    alert_id: Mapped[str | None] = mapped_column(ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    executed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[ExecutionStatus] = mapped_column(Enum(ExecutionStatus), default=ExecutionStatus.IN_PROGRESS, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    playbook = relationship("Playbook")
    executed_by = relationship("User")
    steps: Mapped[list["PlaybookExecutionStep"]] = relationship(back_populates="execution", cascade="all, delete-orphan")


class PlaybookExecutionStep(Base):
    __tablename__ = "playbook_execution_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    execution_id: Mapped[str] = mapped_column(ForeignKey("playbook_executions.id", ondelete="CASCADE"), index=True, nullable=False)
    step_id: Mapped[str] = mapped_column(ForeignKey("playbook_steps.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[StepExecutionStatus] = mapped_column(Enum(StepExecutionStatus), default=StepExecutionStatus.PENDING, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    skip_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    execution: Mapped[PlaybookExecution] = relationship(back_populates="steps")
    step = relationship("PlaybookStep")
    completed_by = relationship("User")
