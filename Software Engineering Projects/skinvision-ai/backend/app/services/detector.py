"""
Acne lesion detector — dispatches to a trained YOLO model if one has
been trained and configured (see `detect_lesions()` at the bottom),
otherwise falls back to a heuristic placeholder that draws boxes
around small dark connected-component "blobs" found by classical
thresholding and guesses a lesion class from local redness.

=====================================================================
CURRENT STATUS (see docs/model_card.md for the full writeup)
=====================================================================
A real YOLOv8n checkpoint is wired in as of this build, trained on a
Kaggle acne-detection dataset for 67 epochs (early stopping) on a
Tesla T4. Its classes are whatever that dataset was annotated with —
{blackheads, dark spot, nodules, papules, pustules, whiteheads} — NOT
the {comedone, papule, pustule, nodule, cyst, scar} set an earlier
version of this file assumed. That mismatch used to cause a hard
500 error the moment the trained model actually returned a detection
(Pydantic rejected the unrecognized class). `LesionClass` in
schemas.py is now a plain `str` for exactly this reason: detector
class names are whatever the loaded checkpoint says they are, not a
fixed enum this file gets to define.

**This checkpoint's validation mAP50 was 0.148 — low, and it should
be treated as experimental**, not a reliable detector. Bounding boxes
it returns should not be presented as confidently accurate; consider
this before removing any "experimental" framing from the UI.

=====================================================================
HOW TO GET (OR IMPROVE) THE REAL MODEL
=====================================================================
Train it with ml/train_detector.py (see QUICKSTART.md), then:
  1. Copy the resulting `best.pt` into backend/app/ml_models/detector/.
  2. Install ml/requirements.txt's ultralytics into the backend's
     environment.
  3. Set SKINVISION_MODELS_ARE_TRAINED=true.
`detect_lesions()` picks up the trained model automatically via
`model_loader.get_detector()` — no further code changes needed for a
*differently*-classed model either: whatever `model.names` the new
checkpoint carries is used as-is. Any load or inference failure logs
a warning and falls back to the heuristic path instead of crashing.

The heuristic path is deliberately conservative (returns at most
`max_detections` boxes) so the overlay stays legible per PRD FR-06
("Do not clutter the image with too many labels").
=====================================================================
"""

from __future__ import annotations

import logging
import uuid

import cv2
import numpy as np

from app.config import settings
from app.schemas import BoundingBox, Detection
from app.services.model_loader import get_detector

logger = logging.getLogger("skinvision.detector")


_KNOWN_LESION_CLASSES = {"blackheads", "dark spot", "nodules", "papules", "pustules", "whiteheads"}
"""What the currently-trained detector checkpoint actually reports
(verified directly from the loaded checkpoint's `model.names`, not
guessed) — used only for the heuristic fallback's class choices below,
so heuristic and trained results look consistent to the frontend. The
trained path itself (`_detect_lesions_trained`) never filters against
this: whatever the loaded model's `model.names` says IS correct, by
definition, since that dict comes from the checkpoint's own training
config. See docs/model_card.md."""


def _clip01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _local_redness(face_rgb: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    patch = face_rgb[y : y + h, x : x + w].astype(np.float32)
    if patch.size == 0:
        return 0.0
    r, g, b = patch[:, :, 0], patch[:, :, 1], patch[:, :, 2]
    return float(np.mean(r - (g + b) / 2.0))


def _detect_lesions_trained(
    face_rgb: np.ndarray,
    crop_offset: tuple[int, int],
    original_size: tuple[int, int],
    max_detections: int,
) -> list[Detection] | None:
    model = get_detector()
    if model is None:
        return None

    try:
        # Ultralytics assumes BGR input (it expects images the way
        # cv2.imread produces them); our face_rgb is RGB, so convert.
        bgr = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2BGR)
        results = model.predict(bgr, verbose=False, conf=settings.detector_confidence_threshold)
    except Exception:  # noqa: BLE001 - inference failure should degrade, not 500
        logger.exception("Trained detector inference failed — falling back to heuristic.")
        return None

    if not results or results[0].boxes is None:
        return []

    result = results[0]
    boxes = result.boxes
    names = result.names  # {class_id: class_name}, from the checkpoint's own training config
    crop_x0, crop_y0 = crop_offset
    orig_w, orig_h = original_size

    order = sorted(range(len(boxes)), key=lambda i: float(boxes.conf[i]), reverse=True)[:max_detections]

    detections: list[Detection] = []
    for i in order:
        x1, y1, x2, y2 = (float(v) for v in boxes.xyxy[i].tolist())
        # Trust the checkpoint's own class names outright — this dict
        # comes straight from the model that was trained (ultralytics
        # embeds it at training time from the dataset's data.yaml), so
        # there is nothing to validate against a fixed list here. An
        # earlier version of this code rejected anything outside a
        # hardcoded 6-class set and silently remapped it to
        # "comedone" — which meant a legitimately trained model with
        # its own class names (e.g. "blackheads", "dark spot") had
        # every detection mislabeled. Don't reintroduce that.
        cls_name = names.get(int(boxes.cls[i]))
        if cls_name is None:
            logger.warning("Trained detector returned a class index with no name mapping — skipping this box.")
            continue

        full_x0, full_y0 = crop_x0 + x1, crop_y0 + y1
        bbox = BoundingBox(
            x=_clip01(round(full_x0 / orig_w, 4)),
            y=_clip01(round(full_y0 / orig_h, 4)),
            width=_clip01(round((x2 - x1) / orig_w, 4)),
            height=_clip01(round((y2 - y1) / orig_h, 4)),
        )
        detections.append(
            Detection(
                id=str(uuid.uuid4())[:8],
                cls=cls_name,
                confidence=round(float(boxes.conf[i]), 2),
                bbox=bbox,
            )
        )
    return detections


def detect_lesions(
    face_rgb: np.ndarray,
    crop_offset: tuple[int, int],
    original_size: tuple[int, int],
    max_detections: int = 8,
) -> tuple[list[Detection], str]:
    """Public entry point used by the /analyze route. Returns
    (detections, source) — see classifier.classify() for why `source`
    reflects what actually ran, not just the config flag."""
    if settings.models_are_trained:
        trained = _detect_lesions_trained(face_rgb, crop_offset, original_size, max_detections)
        if trained is not None:
            return trained, "trained"
    return (
        _detect_lesions_heuristic(face_rgb, crop_offset, original_size, max_detections),
        "heuristic_placeholder",
    )


def _detect_lesions_heuristic(
    face_rgb: np.ndarray,
    crop_offset: tuple[int, int],
    original_size: tuple[int, int],
    max_detections: int = 8,
) -> list[Detection]:
    gray = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2GRAY)
    mean, std = float(gray.mean()), float(gray.std())
    dark_mask = (gray < (mean - 1.1 * std)).astype(np.uint8) * 255
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))

    n, _, stats, _ = cv2.connectedComponentsWithStats(dark_mask, connectivity=8)
    face_area = gray.shape[0] * gray.shape[1]
    min_area = max(4, int(face_area * 0.0003))
    max_area = int(face_area * 0.0015)

    candidates = []
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if min_area <= area <= max_area:
            x, y, w, h = (
                stats[i, cv2.CC_STAT_LEFT],
                stats[i, cv2.CC_STAT_TOP],
                stats[i, cv2.CC_STAT_WIDTH],
                stats[i, cv2.CC_STAT_HEIGHT],
            )
            candidates.append((area, x, y, w, h))

    # Largest blobs first — most visually significant, and keeps the
    # overlay from getting cluttered once we cap at max_detections.
    candidates.sort(key=lambda c: c[0], reverse=True)
    candidates = candidates[:max_detections]

    crop_x0, crop_y0 = crop_offset
    orig_w, orig_h = original_size

    detections: list[Detection] = []
    for area, x, y, w, h in candidates:
        redness = _local_redness(face_rgb, x, y, w, h)
        # Matches the real trained detector's class vocabulary (see
        # _KNOWN_LESION_CLASSES above) so heuristic and trained results
        # render consistently on the frontend regardless of which path
        # actually served a given request.
        lesion_class = "papules" if redness > 12.0 else "blackheads"

        full_x, full_y = crop_x0 + x, crop_y0 + y
        bbox = BoundingBox(
            x=_clip01(round(full_x / orig_w, 4)),
            y=_clip01(round(full_y / orig_h, 4)),
            width=_clip01(round(w / orig_w, 4)),
            height=_clip01(round(h / orig_h, 4)),
        )
        # Confidence intentionally capped — this is a heuristic blob
        # finder, not a trained detector with calibrated confidence.
        size_fraction = area / max_area if max_area else 0.0
        confidence = round(float(np.clip(0.4 + 0.3 * size_fraction, 0.4, 0.7)), 2)

        detections.append(
            Detection(
                id=str(uuid.uuid4())[:8],
                cls=lesion_class,
                confidence=confidence,
                bbox=bbox,
            )
        )

    return detections
