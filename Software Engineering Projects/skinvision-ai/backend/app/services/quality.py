"""
Image-quality assessment (PRD FR-03) and face preprocessing (FR-04).

Unlike the classifier/detector stubs, everything in this module is a
real, working implementation — no trained skin-concern model is
required to detect a face, measure blur, or measure brightness.

Face detection uses OpenCV's bundled Haar Cascade classifier
(`haarcascade_frontalface_default.xml`), which ships inside the
`opencv-python-headless` package itself, so it works fully offline.
It is a reasonable, well-understood baseline for the MVP; the PRD's
"Optional Region Analysis" (forehead/cheeks/nose/chin) can be layered
on top of the returned face box later using landmark detection if the
project adds `mediapipe` or `dlib`.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.config import settings
from app.schemas import ImageQuality, QualityWarning

_FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


@dataclass
class DecodedImage:
    rgb: np.ndarray  # HxWx3, RGB, uint8
    width: int
    height: int


@dataclass
class FaceBox:
    x: int
    y: int
    w: int
    h: int


def decode_image(raw_bytes: bytes) -> DecodedImage:
    """Decode + auto-orient an uploaded image. Raises ValueError on a
    corrupted or unreadable file so the router can return a clean 4xx
    instead of a stack trace (PRD rule: never expose stack traces)."""
    try:
        pil_image = Image.open(io.BytesIO(raw_bytes))
        pil_image = ImageOps.exif_transpose(pil_image)
        pil_image = pil_image.convert("RGB")
    except Exception as exc:  # noqa: BLE001 - we deliberately narrow this
        raise ValueError("Could not decode image file") from exc

    arr = np.array(pil_image)
    return DecodedImage(rgb=arr, width=arr.shape[1], height=arr.shape[0])


def detect_faces(image: DecodedImage) -> list[FaceBox]:
    gray = cv2.cvtColor(image.rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    raw = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=6,
        minSize=(60, 60),
    )
    return [FaceBox(x=int(x), y=int(y), w=int(w), h=int(h)) for x, y, w, h in raw]


def measure_blur(image: DecodedImage) -> float:
    """Variance of the Laplacian — a standard, cheap blur proxy. Higher
    is sharper."""
    gray = cv2.cvtColor(image.rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def measure_brightness(image: DecodedImage) -> float:
    gray = cv2.cvtColor(image.rgb, cv2.COLOR_RGB2GRAY)
    return float(gray.mean())


def assess_quality(image: DecodedImage) -> tuple[ImageQuality, list[FaceBox]]:
    """Runs the full FR-03 checklist and returns a schema-ready
    ImageQuality object plus the detected face boxes (for downstream
    preprocessing)."""
    warnings: list[QualityWarning] = []

    if min(image.width, image.height) < settings.min_image_dimension:
        warnings.append(
            QualityWarning(
                code="image_too_small",
                message=(
                    f"Image is smaller than the recommended "
                    f"{settings.min_image_dimension}x{settings.min_image_dimension}px minimum."
                ),
            )
        )

    faces = detect_faces(image)
    face_count = len(faces)

    if face_count == 0:
        warnings.append(
            QualityWarning(code="no_face_detected", message="No face was detected in the image.")
        )
    elif face_count > settings.max_faces_allowed:
        warnings.append(
            QualityWarning(
                code="multiple_faces_detected",
                message="More than one face was detected. Please upload a photo of a single face.",
            )
        )

    largest_face = max(faces, key=lambda f: f.w * f.h) if faces else None
    if largest_face is not None:
        face_area_ratio = (largest_face.w * largest_face.h) / (image.width * image.height)
        if face_area_ratio < settings.min_face_area_ratio:
            warnings.append(
                QualityWarning(
                    code="face_too_small",
                    message="The face takes up too little of the frame for a reliable analysis.",
                )
            )

    blur_score = measure_blur(image)
    if blur_score < settings.blur_variance_threshold:
        warnings.append(
            QualityWarning(code="image_too_blurry", message="The image appears too blurry.")
        )

    brightness = measure_brightness(image)
    if brightness < settings.min_brightness:
        warnings.append(
            QualityWarning(code="image_too_dark", message="The image is too dark to analyze reliably.")
        )
    elif brightness > settings.max_brightness:
        warnings.append(
            QualityWarning(code="image_overexposed", message="The image appears overexposed.")
        )

    usable = (
        face_count == 1
        and blur_score >= settings.blur_variance_threshold
        and settings.min_brightness <= brightness <= settings.max_brightness
        and not any(w.code == "face_too_small" for w in warnings)
        and not any(w.code == "image_too_small" for w in warnings)
    )

    # Quality score: a simple, explainable 0-1 blend. Not a learned
    # metric — documented as such in docs/model_card.md.
    blur_component = min(blur_score / (settings.blur_variance_threshold * 2), 1.0)
    brightness_mid = (settings.min_brightness + settings.max_brightness) / 2
    brightness_span = (settings.max_brightness - settings.min_brightness) / 2
    brightness_component = max(0.0, 1 - abs(brightness - brightness_mid) / brightness_span)
    face_component = 1.0 if face_count == 1 else 0.0
    quality_score = round(
        0.4 * face_component + 0.3 * blur_component + 0.3 * brightness_component, 2
    )

    return (
        ImageQuality(
            usable=usable,
            face_count=face_count,
            quality_score=quality_score,
            warnings=warnings,
        ),
        faces,
    )


def crop_face_region(image: DecodedImage, face: FaceBox, margin: float = 0.35) -> np.ndarray:
    """Crop the face with a margin so downstream models see forehead,
    jawline, and ears — matches PRD FR-04 step 3."""
    mx, my = int(face.w * margin), int(face.h * margin)
    x0, y0 = max(face.x - mx, 0), max(face.y - my, 0)
    x1 = min(face.x + face.w + mx, image.width)
    y1 = min(face.y + face.h + my, image.height)
    return image.rgb[y0:y1, x0:x1]
