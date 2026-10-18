"""
Typed API schemas.

These mirror the JSON contracts documented in the PRD (sections FR-03,
FR-05, FR-06, 6.3) as closely as possible so the frontend can rely on a
stable shape. Field additions beyond the PRD (e.g. `meta.model_status`)
exist only to make the honesty requirements in section 26 ("do not
present confident results") visible in the API itself.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ConcernLabel = Literal[
    "acne",
    "blackheads",
    "whiteheads",
    "visible_pores",
    "redness",
    "dark_spots",
    "pigmentation",
    "wrinkles",
    "acne_scars",
]

ConfidenceLevel = Literal["high", "medium", "low"]
ConcernStatus = Literal["detected", "possible", "not_detected"]
# Deliberately a plain str, not a Literal/enum: unlike ConcernLabel
# (which the recommendation engine keys off, so it must stay a fixed
# taxonomy), lesion classes are whatever names the *currently loaded*
# detector checkpoint was trained with (ultralytics reads these from
# its own embedded `model.names`, e.g. {0: "blackheads", 1: "dark
# spot", ...}). A fixed Literal here would reject a legitimately
# trained model's real output — which is exactly the bug this
# comment is here to prevent reintroducing. See docs/model_card.md.
LesionClass = str


class QualityWarning(BaseModel):
    code: str
    message: str


class ImageQuality(BaseModel):
    """PRD section FR-03 example output."""

    usable: bool
    face_count: int
    quality_score: float = Field(ge=0.0, le=1.0)
    warnings: list[QualityWarning] = []


class BoundingBox(BaseModel):
    """Normalized [0, 1] coordinates so the frontend can render the
    overlay at any display size, per PRD FR-06."""

    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    width: float = Field(ge=0.0, le=1.0)
    height: float = Field(ge=0.0, le=1.0)


class Concern(BaseModel):
    label: ConcernLabel
    display_name: str
    probability: float = Field(ge=0.0, le=1.0)
    confidence_level: ConfidenceLevel
    status: ConcernStatus
    # Short, approved-wording explanation for the FR-07 concern card.
    # Not present in the PRD's minimal FR-05 JSON example, added
    # because FR-07 explicitly requires "a short explanation" per card.
    explanation: str


class Detection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    cls: LesionClass = Field(serialization_alias="class")
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: BoundingBox


class Recommendation(BaseModel):
    id: str
    concern: ConcernLabel
    title: str
    text: str
    priority: Literal["general", "professional_evaluation"]
    source_type: Literal["educational"] = "educational"


class ModelStatus(BaseModel):
    """Transparency block. Not in the original PRD schema, added so the
    UI can honestly label results instead of implying a validated
    clinical model produced them (PRD section 3, section 26 rule 6)."""

    classifier: Literal["trained", "heuristic_placeholder"]
    detector: Literal["trained", "heuristic_placeholder"]
    registry_version: str
    note: str


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    request_id: str
    quality: ImageQuality
    concerns: list[Concern] = []
    detections: list[Detection] = []
    recommendations: list[Recommendation] = []
    professional_evaluation_suggested: bool
    model_status: ModelStatus


class ErrorResponse(BaseModel):
    error_code: str
    message: str
