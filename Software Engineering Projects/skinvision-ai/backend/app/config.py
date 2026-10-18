"""
Centralized configuration for SkinVision AI backend.

Kept separate from route/service logic per PRD Non-Functional
Requirements ("Keep configuration centralized"). All MVP limits from
PRD section 5 (FR-02) live here so they are defined exactly once.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SKINVISION_",
        protected_namespaces=(),
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App metadata -------------------------------------------------
    app_name: str = "SkinVision AI API"
    api_version: str = "0.1.0-mvp"
    model_registry_version: str = "unversioned-stub"

    # --- CORS -----------------------------------------------------------
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # --- Upload limits (PRD FR-02 "Suggested MVP Limits") ---------------
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    min_image_dimension: int = 256  # px, shorter edge
    recommended_image_dimension: int = 512  # px
    max_faces_allowed: int = 1
    allowed_content_types: tuple[str, ...] = (
        "image/jpeg",
        "image/png",
        "image/webp",
    )

    # --- Image quality thresholds (FR-03) --------------------------------
    # Variance of Laplacian below this is treated as "too blurry".
    # Tuned conservatively; documented in docs/model_card.md and
    # intended to be revisited once real evaluation data exists.
    blur_variance_threshold: float = 80.0
    # Mean pixel brightness (0-255) outside this range is flagged.
    min_brightness: float = 40.0
    max_brightness: float = 235.0
    # Minimum fraction of image height the detected face bounding box
    # should occupy for the face to be considered "usable".
    min_face_area_ratio: float = 0.08

    # --- Feature flags ----------------------------------------------------
    # The trained deep-learning classifier/detector described in PRD
    # phases 5-10 require licensed datasets and GPU training that are
    # not available in this environment. This flag makes that fact
    # visible in every API response rather than hiding it. Flip it to
    # true once you've trained models and dropped checkpoints in the
    # paths below (see QUICKSTART.md) — if a checkpoint is missing or
    # torch/ultralytics aren't installed, the code falls back to the
    # heuristic placeholder automatically and logs a warning rather
    # than crashing.
    models_are_trained: bool = False

    # --- Trained model checkpoint locations --------------------------------
    classifier_checkpoint_path: str = "app/ml_models/classifier/best.pt"
    detector_checkpoint_path: str = "app/ml_models/detector/best.pt"
    # Probability threshold above which a classifier label counts as
    # "detected" rather than "possible" (only used once a real trained
    # model is loaded — see services/classifier.py).
    classifier_detected_threshold: float = 0.5
    classifier_possible_threshold: float = 0.3
    classifier_high_confidence_threshold: float = 0.75
    detector_confidence_threshold: float = 0.35
    # Optional free-text caveat appended to model_status.note whenever
    # the trained detector actually serves a response — e.g. to record
    # a known-low validation score so nobody downstream (including the
    # UI) accidentally presents an experimental checkpoint as reliable.
    # Empty by default; set via SKINVISION_DETECTOR_QUALITY_NOTE.
    detector_quality_note: str = ""


settings = Settings()
