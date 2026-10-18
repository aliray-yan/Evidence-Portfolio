from datetime import datetime

from pydantic import BaseModel, Field

from app.models.ioc import IOCType, RiskLevel


class IOCLookupRequest(BaseModel):
    ioc: str = Field(min_length=2, max_length=2048)
    type: IOCType | None = None
    force_refresh: bool = False


class BulkIOCLookupRequest(BaseModel):
    iocs: list[str] = Field(min_length=1, max_length=1000)
    force_refresh: bool = False


class IOCLookupRead(BaseModel):
    id: str
    ioc_value: str
    ioc_type: IOCType
    lookup_results: dict
    risk_score: int
    risk_level: RiskLevel
    tags: list[str]
    first_lookup: datetime
    last_lookup: datetime
    lookup_count: int
    cached_until: datetime

    model_config = {"from_attributes": True}


class IOCResult(BaseModel):
    ioc: str
    type: str
    risk_score: int
    risk_level: str
    summary: str
    sources: dict
    recommendations: list[str]
    related_alerts: list[dict] = []
    lookup_timestamp: datetime
    cached_until: datetime


class APIUsageRead(BaseModel):
    api_name: str
    requests_made: int
    requests_limit: int
    last_request_at: datetime | None = None
