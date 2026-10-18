from datetime import date, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.helpers import now_utc


class ReportType(StrEnum):
    DAILY_SUMMARY = "daily_summary"
    WEEKLY_THREAT = "weekly_threat"
    MONTHLY_EXECUTIVE = "monthly_executive"
    INCIDENT = "incident"
    CUSTOM = "custom"


class ReportStatus(StrEnum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ReportType] = mapped_column(Enum(ReportType), index=True, nullable=False)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    generated_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False)

    generated_by = relationship("User")


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    report_type: Mapped[str] = mapped_column(String(80), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    schedule: Mapped[str] = mapped_column(String(120), nullable=False)
    recipients: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_by = relationship("User")


class MetricsSnapshot(Base):
    __tablename__ = "metrics_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    metric_name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    dimensions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    snapshot_date: Mapped[date] = mapped_column(index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
