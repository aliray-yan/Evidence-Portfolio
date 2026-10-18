from pydantic import BaseModel, Field

from app.models.alert import AlertSeverity


class EDRIndicator(BaseModel):
    type: str
    value: str


class EDRAlertIn(BaseModel):
    alert_id: str | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    category: str = "Endpoint Detection"
    event_type: str | None = None
    device_id: str | None = None
    endpoint_id: str | None = None
    hostname: str | None = None
    platform: str | None = None
    os_version: str | None = None
    app_version: str | None = None
    username: str | None = None
    process_name: str | None = None
    package_name: str | None = None
    command_line: str | None = None
    file_hash: str | None = None
    src_ip: str | None = None
    dst_ip: str | None = None
    network_protocol: str | None = None
    action_taken: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    is_rooted_or_jailbroken: bool | None = None
    iocs: list[EDRIndicator] = []
    raw_event: dict = {}


class EDRAlertBatch(BaseModel):
    alerts: list[EDRAlertIn] = Field(min_length=1, max_length=500)


class EDRIngestResult(BaseModel):
    created: int
    updated: int = 0
    alert_ids: list[str]
