from datetime import datetime

from pydantic import BaseModel, Field

from app.models.case import CaseSeverity, CaseStatus


class CaseBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=3)
    severity: CaseSeverity
    priority: int = Field(default=3, ge=1, le=5)
    category: str = Field(min_length=2, max_length=120)


class CaseCreate(CaseBase):
    assigned_to_id: str | None = None
    linked_alert_ids: list[str] = []


class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: CaseSeverity | None = None
    status: CaseStatus | None = None
    priority: int | None = Field(default=None, ge=1, le=5)
    category: str | None = None
    assigned_to_id: str | None = None
    escalated_to_id: str | None = None
    resolution_summary: str | None = None
    root_cause: str | None = None
    lessons_learned: str | None = None
    status_comment: str | None = None


class CaseRead(CaseBase):
    id: str
    case_number: str
    status: CaseStatus
    created_by_id: str | None = None
    assigned_to_id: str | None = None
    escalated_to_id: str | None = None
    sla_deadline: datetime | None = None
    sla_breached: bool
    resolution_summary: str | None = None
    root_cause: str | None = None
    lessons_learned: str | None = None
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseCommentCreate(BaseModel):
    comment: str = Field(min_length=1)
    is_internal: bool = True


class CaseCommentRead(BaseModel):
    id: str
    case_id: str
    user_id: str | None = None
    comment: str
    is_internal: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    assigned_to_id: str | None = None
    due_date: datetime | None = None


class CaseTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to_id: str | None = None
    status: str | None = None
    due_date: datetime | None = None


class CaseTaskRead(BaseModel):
    id: str
    case_id: str
    title: str
    description: str | None = None
    assigned_to_id: str | None = None
    status: str
    due_date: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseTimelineRead(BaseModel):
    id: str
    case_id: str
    user_id: str | None = None
    event_type: str
    description: str
    old_value: str | None = None
    new_value: str | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class CaseAssignRequest(BaseModel):
    assigned_to_id: str


class PaginatedCases(BaseModel):
    items: list[CaseRead]
    total: int
    page: int
    page_size: int
