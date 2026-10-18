from datetime import datetime

from pydantic import BaseModel, Field

from app.models.alert import AlertSeverity, AlertStatus


class IOCItem(BaseModel):
    type: str
    value: str


class AlertBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=3)
    severity: AlertSeverity
    source: str = Field(min_length=2, max_length=120)
    source_ref: str | None = None
    category: str = Field(min_length=2, max_length=120)
    iocs: list[IOCItem] = []
    raw_log: str | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None


class AlertCreate(AlertBase):
    assigned_to_id: str | None = None


class AlertUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: AlertSeverity | None = None
    status: AlertStatus | None = None
    source: str | None = None
    source_ref: str | None = None
    category: str | None = None
    iocs: list[IOCItem] | None = None
    raw_log: str | None = None
    assigned_to_id: str | None = None
    case_id: str | None = None
    priority_score: int | None = Field(default=None, ge=0, le=100)


class AlertRead(AlertBase):
    id: str
    status: AlertStatus
    assigned_to_id: str | None = None
    case_id: str | None = None
    priority_score: int
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertCommentCreate(BaseModel):
    comment: str = Field(min_length=1)


class AlertCommentRead(BaseModel):
    id: str
    alert_id: str
    user_id: str | None = None
    comment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertHistoryRead(BaseModel):
    id: str
    alert_id: str
    user_id: str | None = None
    field_changed: str
    old_value: str | None = None
    new_value: str | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AlertAssignRequest(BaseModel):
    assigned_to_id: str


class AlertEscalateRequest(BaseModel):
    comment: str | None = None


class AlertLinkCaseRequest(BaseModel):
    case_id: str


class BulkAlertAction(BaseModel):
    alert_ids: list[str] = Field(min_length=1)
    action: str
    assigned_to_id: str | None = None
    status: AlertStatus | None = None


class PaginatedAlerts(BaseModel):
    items: list[AlertRead]
    total: int
    page: int
    page_size: int
