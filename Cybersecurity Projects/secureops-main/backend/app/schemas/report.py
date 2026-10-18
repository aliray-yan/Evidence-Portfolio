from datetime import datetime

from pydantic import BaseModel, Field

from app.models.report import ReportStatus, ReportType


class ReportGenerateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    type: ReportType
    parameters: dict = {}
    formats: list[str] = ["json", "csv", "html", "pdf"]
    email_recipients: list[str] = []


class ReportRead(BaseModel):
    id: str
    name: str
    type: ReportType
    parameters: dict
    generated_by_id: str | None = None
    generated_at: datetime
    file_path: str | None = None
    status: ReportStatus

    model_config = {"from_attributes": True}


class ScheduledReportCreate(BaseModel):
    report_type: str
    parameters: dict = {}
    schedule: str
    recipients: list[str] = []
    is_active: bool = True


class ScheduledReportRead(ScheduledReportCreate):
    id: str
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    created_by_id: str | None = None

    model_config = {"from_attributes": True}


class ReportEmailRequest(BaseModel):
    recipients: list[str] = Field(min_length=1)
    format: str = "pdf"
    subject: str | None = None
    message: str | None = None
