from datetime import date, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Date, DateTime, Enum, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.helpers import now_utc


class IOCType(StrEnum):
    IP = "ip"
    DOMAIN = "domain"
    URL = "url"
    HASH_MD5 = "hash_md5"
    HASH_SHA1 = "hash_sha1"
    HASH_SHA256 = "hash_sha256"
    EMAIL = "email"
    CVE = "cve"
    UNKNOWN = "unknown"


class RiskLevel(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    CLEAN = "clean"
    UNKNOWN = "unknown"


class IOCLookup(Base):
    __tablename__ = "ioc_lookups"
    __table_args__ = (Index("ix_ioc_value_type", "ioc_value", "ioc_type"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    ioc_value: Mapped[str] = mapped_column(String(2048), index=True, nullable=False)
    ioc_type: Mapped[IOCType] = mapped_column(Enum(IOCType), index=True, nullable=False)
    lookup_results: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.UNKNOWN, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    first_lookup: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    last_lookup: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    lookup_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cached_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class APIUsage(Base):
    __tablename__ = "api_usage"
    __table_args__ = (Index("ix_api_usage_name_date", "api_name", "date", unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    api_name: Mapped[str] = mapped_column(String(80), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    requests_made: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    requests_limit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_request_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
