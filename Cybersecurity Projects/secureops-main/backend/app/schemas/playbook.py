from datetime import datetime

from pydantic import BaseModel, Field

from app.models.playbook import ExecutionStatus, StepExecutionStatus, StepType


class PlaybookStepCreate(BaseModel):
    step_number: int = Field(ge=1)
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2)
    step_type: StepType = StepType.MANUAL
    is_required: bool = True
    automation_config: dict = {}
    expected_duration_minutes: int = Field(default=15, ge=1)
    parent_step_id: str | None = None
    branch_condition: str | None = None


class PlaybookCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=3)
    category: str = Field(min_length=2, max_length=120)
    trigger_conditions: dict = {}
    is_active: bool = True
    steps: list[PlaybookStepCreate] = []


class PlaybookUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    trigger_conditions: dict | None = None
    is_active: bool | None = None
    steps: list[PlaybookStepCreate] | None = None


class PlaybookStepRead(PlaybookStepCreate):
    id: str
    playbook_id: str

    model_config = {"from_attributes": True}


class PlaybookRead(BaseModel):
    id: str
    name: str
    description: str
    category: str
    trigger_conditions: dict
    is_active: bool
    version: int
    created_by_id: str | None = None
    created_at: datetime
    updated_at: datetime
    steps: list[PlaybookStepRead] = []

    model_config = {"from_attributes": True}


class PlaybookExecuteRequest(BaseModel):
    alert_id: str | None = None
    case_id: str | None = None


class ExecutionStepUpdate(BaseModel):
    status: StepExecutionStatus
    notes: str | None = None
    evidence: dict = {}
    skip_reason: str | None = None


class PlaybookExecutionStepRead(BaseModel):
    id: str
    execution_id: str
    step_id: str
    status: StepExecutionStatus
    notes: str | None = None
    evidence: dict
    started_at: datetime | None = None
    completed_at: datetime | None = None
    completed_by_id: str | None = None
    skip_reason: str | None = None

    model_config = {"from_attributes": True}


class PlaybookExecutionRead(BaseModel):
    id: str
    playbook_id: str
    alert_id: str | None = None
    case_id: str | None = None
    executed_by_id: str | None = None
    status: ExecutionStatus
    started_at: datetime
    completed_at: datetime | None = None
    steps: list[PlaybookExecutionStepRead] = []

    model_config = {"from_attributes": True}
