"""
Skin-concern classifier — dispatches to a trained model if one has
been configured and trained (see `classify()` at the bottom), and
otherwise falls back to a heuristic placeholder built from classical
computer-vision statistics (color balance, edge density, connected
"blob" counting).

=====================================================================
CURRENT STATUS (see docs/model_card.md for the full writeup)
=====================================================================
A real EfficientNet-B0 checkpoint is wired in as of this build,
trained on Kaggle (Tesla T4) using ml/train_classifier.py against all
9 canonical labels in labels.py, including acne_scars. Its
`labels.json` matches DISPLAY_NAMES/EXPLANATIONS below exactly, so —
unlike the detector (see detector.py's docstring for that story) —
this one needed no code changes to wire in correctly, just the
checkpoint files and the config flag.

=====================================================================
HOW TO GET (OR IMPROVE) THE REAL MODEL
=====================================================================
Train it with ml/train_classifier.py (see QUICKSTART.md for the full
walkthrough), then:
  1. Copy the resulting `best.pt` and `labels.json` into
     backend/app/ml_models/classifier/.
  2. Install ml/requirements.txt's torch/torchvision into the
     backend's environment (or the same venv).
  3. Set SKINVISION_MODELS_ARE_TRAINED=true.
That's it — `classify()` below picks up the trained model
automatically via `model_loader.get_classifier()`, with no further
code changes needed. If loading fails for any reason (missing file,
missing dependency, corrupted checkpoint), it logs a warning and
silently falls back to the heuristic path rather than crashing the
API — see model_loader.py.

Every heuristic score is capped below "high" confidence, and the
API's `model_status.classifier` field always reports which of the two
paths actually produced a given response, so the frontend and the
person using the product are never told a validated model produced
numbers that a heuristic actually produced. See docs/model_card.md.
=====================================================================
"""

from __future__ import annotations

import logging

import cv2
import numpy as np
from PIL import Image

from app.config import settings
from app.schemas import Concern, ConcernLabel
from app.services.model_loader import get_classifier

logger = logging.getLogger("skinvision.classifier")

DISPLAY_NAMES: dict[ConcernLabel, str] = {
    "acne": "Possible acne",
    "blackheads": "Possible blackheads",
    "whiteheads": "Possible whiteheads",
    "visible_pores": "Visible pores",
    "redness": "Visible redness",
    "dark_spots": "Dark spots",
    "pigmentation": "Pigmentation",
    "wrinkles": "Fine lines / wrinkles",
    "acne_scars": "Possible acne scarring",
}

# Approved-wording explanations (PRD section 3 "Approved wording").
EXPLANATIONS: dict[ConcernLabel, str] = {
    "acne": "The model detected visible features associated with acne.",
    "blackheads": "The image contains small dark features consistent with blackheads.",
    "whiteheads": "The image contains small light, raised features consistent with whiteheads.",
    "visible_pores": "Possible visible or enlarged pores.",
    "redness": "The image contains features consistent with redness.",
    "dark_spots": "The image contains darker patches consistent with dark spots.",
    "pigmentation": "The image contains features consistent with uneven pigmentation.",
    "wrinkles": "The image contains texture consistent with fine lines or wrinkles.",
    "acne_scars": "The image contains features that may be consistent with acne scarring.",
}


def _to_gray(face_rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(face_rgb, cv2.COLOR_RGB2GRAY)


def _redness_score(face_rgb: np.ndarray) -> float:
    """Real signal: mean(R - (G+B)/2) over the face crop, normalized.
    Simple color-channel heuristic used in classical dermatology
    imaging as a rough erythema proxy — not a trained model."""
    r = face_rgb[:, :, 0].astype(np.float32)
    g = face_rgb[:, :, 1].astype(np.float32)
    b = face_rgb[:, :, 2].astype(np.float32)
    raw = float(np.mean(r - (g + b) / 2.0))
    return float(np.clip(raw / 30.0, 0.0, 1.0))


def _texture_roughness(face_rgb: np.ndarray) -> float:
    """Real signal: local variance of the Laplacian across the face
    crop. Higher = more fine-grained texture (used as a crude pore /
    fine-line proxy, not a trained model)."""
    gray = _to_gray(face_rgb)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(np.clip(lap.var() / 400.0, 0.0, 1.0))


def _edge_density(face_rgb: np.ndarray) -> float:
    """Real signal: fraction of Canny edge pixels, used as a crude
    line/wrinkle-density proxy."""
    gray = _to_gray(face_rgb)
    edges = cv2.Canny(gray, 40, 120)
    return float(np.clip((edges.mean() / 255.0) * 6.0, 0.0, 1.0))


def _blob_counts(face_rgb: np.ndarray) -> dict[str, int]:
    """Real signal: connected-component blob counting on thresholded
    dark/bright regions, bucketed by size. This is a coarse stand-in
    for lesion/spot counting and is not a trained detector."""
    gray = _to_gray(face_rgb)
    mean, std = float(gray.mean()), float(gray.std())

    dark_mask = (gray < (mean - 1.1 * std)).astype(np.uint8) * 255
    bright_mask = (gray > (mean + 1.4 * std)).astype(np.uint8) * 255

    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    bright_mask = cv2.morphologyEx(bright_mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))

    area = gray.shape[0] * gray.shape[1]
    small_max = area * 0.0015  # small pinpoint blobs (blackheads/whiteheads)
    large_min = area * 0.003   # broader patches (dark spots / pigmentation)

    def bucket(mask: np.ndarray) -> tuple[int, int]:
        n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        small = large = 0
        for i in range(1, n):  # skip background label 0
            comp_area = stats[i, cv2.CC_STAT_AREA]
            if comp_area <= small_max:
                small += 1
            elif comp_area >= large_min:
                large += 1
        return small, large

    dark_small, dark_large = bucket(dark_mask)
    bright_small, _ = bucket(bright_mask)

    return {
        "dark_small": dark_small,
        "dark_large": dark_large,
        "bright_small": bright_small,
    }


def _count_to_score(count: int, saturate_at: int) -> float:
    return float(np.clip(count / saturate_at, 0.0, 1.0))


def _confidence_and_status(probability: float) -> tuple[str, str]:
    """Heuristic outputs are capped below 'high' confidence — only a
    validated trained model should ever report high confidence."""
    if probability >= 0.55:
        confidence = "medium"
        status = "detected"
    elif probability >= 0.30:
        confidence = "low"
        status = "possible"
    else:
        confidence = "low"
        status = "not_detected"
    return confidence, status


def _confidence_and_status_trained(probability: float) -> tuple[str, str]:
    """A real trained model is allowed to report 'high' confidence,
    unlike the heuristic path above."""
    if probability >= settings.classifier_high_confidence_threshold:
        return "high", "detected"
    if probability >= settings.classifier_detected_threshold:
        return "medium", "detected"
    if probability >= settings.classifier_possible_threshold:
        return "low", "possible"
    return "low", "not_detected"


def _classify_trained(face_rgb: np.ndarray) -> list[Concern] | None:
    """Runs the real trained classifier if one is configured and
    loadable. Returns None (never raises) if it isn't available, so
    the caller can fall back to the heuristic — see model_loader.py
    for exactly what "available" checks."""
    loaded = get_classifier()
    if loaded is None:
        return None
    model, label_order, transform = loaded

    try:
        import torch

        pil_image = Image.fromarray(face_rgb)
        tensor = transform(pil_image).unsqueeze(0)
        with torch.no_grad():
            probabilities = torch.sigmoid(model(tensor))[0].tolist()
    except Exception:  # noqa: BLE001 - inference failure should degrade, not 500
        logger.exception("Trained classifier inference failed — falling back to heuristic.")
        return None

    concerns: list[Concern] = []
    for label, probability in zip(label_order, probabilities):
        if label not in DISPLAY_NAMES:
            logger.warning("Trained classifier produced unknown label %r — skipping it.", label)
            continue
        confidence, status = _confidence_and_status_trained(probability)
        concerns.append(
            Concern(
                label=label,  # type: ignore[arg-type]
                display_name=DISPLAY_NAMES[label],  # type: ignore[index]
                probability=round(probability, 2),
                confidence_level=confidence,
                status=status,
                explanation=EXPLANATIONS[label],  # type: ignore[index]
            )
        )
    return concerns


def classify(face_rgb: np.ndarray) -> tuple[list[Concern], str]:
    """Public entry point used by the /analyze route. Tries the trained
    model first (only if `models_are_trained` is set); falls back to
    the heuristic placeholder otherwise or on any failure.

    Returns (concerns, source) where source is "trained" or
    "heuristic_placeholder" — reflecting what *actually* ran for this
    call, not just the config flag, so `model_status` in the API
    response can never claim "trained" when a trained model wasn't
    actually used (e.g. checkpoint loaded fine but inference itself
    failed for this one image)."""
    if settings.models_are_trained:
        trained = _classify_trained(face_rgb)
        if trained is not None:
            return trained, "trained"
    return _classify_heuristic(face_rgb), "heuristic_placeholder"


def _classify_heuristic(face_rgb: np.ndarray) -> list[Concern]:
    """Returns one Concern per canonical label (PRD FR-05), computed
    from classical CV heuristics. `acne_scars` is intentionally
    skipped: the PRD marks it optional and conditional on a *verified*
    scarring dataset (section 5), which this build does not have."""
    redness = _redness_score(face_rgb)
    texture = _texture_roughness(face_rgb)
    edges = _edge_density(face_rgb)
    blobs = _blob_counts(face_rgb)

    scores: dict[ConcernLabel, float] = {
        "redness": redness,
        "visible_pores": texture,
        "wrinkles": edges,
        "dark_spots": _count_to_score(blobs["dark_large"], saturate_at=6),
        "pigmentation": _count_to_score(blobs["dark_large"], saturate_at=10) * 0.8,
        "blackheads": _count_to_score(blobs["dark_small"], saturate_at=25),
        "whiteheads": _count_to_score(blobs["bright_small"], saturate_at=20),
        # Acne correlates loosely with redness + small inflamed-looking blobs.
        "acne": float(
            np.clip(0.6 * redness + 0.4 * _count_to_score(blobs["dark_small"], saturate_at=30), 0.0, 1.0)
        ),
    }

    concerns: list[Concern] = []
    for label, probability in scores.items():
        confidence, status = _confidence_and_status(probability)
        concerns.append(
            Concern(
                label=label,
                display_name=DISPLAY_NAMES[label],
                probability=round(probability, 2),
                confidence_level=confidence,
                status=status,
                explanation=EXPLANATIONS[label],
            )
        )
    return concerns
