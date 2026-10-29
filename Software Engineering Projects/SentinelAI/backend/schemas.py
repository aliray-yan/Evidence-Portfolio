from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal

class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class Login(Input):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1,max_length=200)

class DemoLogin(Input):
    user_id: str = Field(max_length=80)

class Note(Input):
    body: str = Field(min_length=5,max_length=4000)

class Decision(Input):
    action: Literal["confirm","dismiss","escalate","request_evidence","appeal","assign"]
    reason: str = Field(min_length=10,max_length=4000)
    version: int = Field(ge=1)
    assigned_to: str | None = Field(default=None,max_length=80)

class AlertAction(Input):
    action: Literal["acknowledge","assign","escalate","resolve"]
    reason: str = Field(min_length=10,max_length=2000)
    version: int = Field(ge=1)
    assigned_to: str | None = Field(default=None,max_length=80)

class UserCreate(Input):
    name: str = Field(min_length=2,max_length=100)
    email: str = Field(min_length=5,max_length=200,pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    role: Literal["citizen","officer","supervisor","responder","admin"]
    password: str = Field(min_length=12,max_length=128)

class UserUpdate(Input):
    role: Literal["citizen","officer","supervisor","responder","admin"]
    active: bool
    reason: str = Field(min_length=10,max_length=500)

class Device(Input):
    name: str = Field(min_length=2,max_length=100)
    identifier: str = Field(min_length=3,max_length=100,pattern=r"^[A-Za-z0-9_.-]+$")
    owner_id: str | None = None

class Phrase(Input):
    phrase: str = Field(min_length=3,max_length=200)
    category: Literal["routine","ambiguous","coercive","safety"]
    language: str = Field(min_length=2,max_length=40)
    explanation: str = Field(min_length=10,max_length=500)

class SettingsUpdate(Input):
    value: dict
    version: int = Field(ge=1)
    reason: str = Field(min_length=10,max_length=500)

class Reason(Input):
    reason: str = Field(min_length=10,max_length=500)

class Hold(Reason):
    enabled: bool
