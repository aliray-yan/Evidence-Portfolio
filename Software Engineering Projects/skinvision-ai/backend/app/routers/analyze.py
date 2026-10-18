from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.schemas import AnalyzeResponse, ModelStatus
from app.services import classifier, detector, quality, recommendations

router = APIRouter()


def _build_model_status(classifier_source: str, detector_source: str) -> ModelStatus:
    """Built per-request from what actually ran (see classifier.classify
    / detector.detect_lesions docstrings) rather than just the config
    flag — so a checkpoint that fails to load or fails during
    inference can never be misreported as "trained"."""
    any_heuristic = "heuristic_placeholder" in (classifier_source, detector_source)
    if any_heuristic:
        note = (
            "This build uses classical computer-vision heuristics as a stand-in for "
            "the trained deep-learning model(s) described in the PRD. Treat concern "
            "and detection results as illustrative, not clinically meaningful."
        )
    else:
        note = "Trained model in use for both classification and detection."
    if detector_source == "trained" and settings.detector_quality_note:
        note = f"{note} {settings.detector_quality_note}"
    return ModelStatus(
        classifier=classifier_source,  # type: ignore[arg-type]
        detector=detector_source,  # type: ignore[arg-type]
        registry_version=settings.model_registry_version,
        note=note,
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...)) -> AnalyzeResponse:
    # --- FR-02 validation ------------------------------------------------
    if image.content_type not in settings.allowed_content_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{image.content_type}'. Use JPG, PNG, or WebP.",
        )

    raw_bytes = await image.read()
    if len(raw_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_size_bytes // (1024 * 1024)} MB limit.",
        )
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        decoded = quality.decode_image(raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Uploaded bytes are never persisted to disk or logged — PRD rules
    # 12/13 ("Do not store uploaded facial images", "Do not log raw
    # images"). `raw_bytes` and `decoded` live only in this request's
    # memory and are discarded once this function returns.

    quality_result, faces = quality.assess_quality(decoded)
    request_id = str(uuid.uuid4())

    if not quality_result.usable or not faces:
        # FR-03: never silently analyze a poor-quality image and
        # present confident results. Nothing was actually run, so
        # report status based on what *would* run, for transparency.
        placeholder_status = _build_model_status(
            "trained" if settings.models_are_trained else "heuristic_placeholder",
            "trained" if settings.models_are_trained else "heuristic_placeholder",
        )
        return AnalyzeResponse(
            request_id=request_id,
            quality=quality_result,
            concerns=[],
            detections=[],
            recommendations=[],
            professional_evaluation_suggested=False,
            model_status=placeholder_status,
        )

    largest_face = max(faces, key=lambda f: f.w * f.h)
    face_crop = quality.crop_face_region(decoded, largest_face)

    concerns, classifier_source = classifier.classify(face_crop)
    margin_x = int(largest_face.w * 0.35)
    margin_y = int(largest_face.h * 0.35)
    crop_offset = (max(largest_face.x - margin_x, 0), max(largest_face.y - margin_y, 0))
    detections, detector_source = detector.detect_lesions(
        face_crop,
        crop_offset=crop_offset,
        original_size=(decoded.width, decoded.height),
    )
    recs, professional_eval = recommendations.generate_recommendations(concerns)

    return AnalyzeResponse(
        request_id=request_id,
        quality=quality_result,
        concerns=concerns,
        detections=detections,
        recommendations=recs,
        professional_evaluation_suggested=professional_eval,
        model_status=_build_model_status(classifier_source, detector_source),
    )
