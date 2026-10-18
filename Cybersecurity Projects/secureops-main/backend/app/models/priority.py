from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.helpers import now_utc


class PatternType(StrEnum):
    EXACT = "exact"
    REGEX = "regex"
    CONTAINS = "contains"


class AssetType(StrEnum):
    SERVER = "server"
    WORKSTATION = "workstation"
    NETWORK_DEVICE = "network_device"
    CLOUD_RESOURCE = "cloud_resource"


class AssetCriticalityLevel(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PriorityRule(Base):
    __tablename__ = "priority_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    conditions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    score_modifier: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    created_by = relationship("User")


class FalsePositivePattern(Base):
    __tablename__ = "false_positive_patterns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    pattern_type: Mapped[PatternType] = mapped_column(String(40), default=PatternType.CONTAINS, nullable=False)
    field: Mapped[str] = mapped_column(String(120), nullable=False)
    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)
    times_matched: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    created_by = relationship("User")


class AlertCorrelation(Base):
    __tablename__ = "alert_correlations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    correlation_group_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    alert_id: Mapped[str] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), index=True, nullable=False)
    correlation_reason: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class AssetCriticality(Base):
    __tablename__ = "asset_criticality"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    asset_identifier: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(String(80), default=AssetType.WORKSTATION, nullable=False)
    criticality: Mapped[AssetCriticalityLevel] = mapped_column(String(40), default=AssetCriticalityLevel.MEDIUM, nullable=False)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
