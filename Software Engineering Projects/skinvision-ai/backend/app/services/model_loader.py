"""
Lazy loader for trained model checkpoints.

Everything here is optional and fails soft: if torch/ultralytics
aren't installed, or a checkpoint file isn't present at the
configured path, the getters return None and the caller (classifier.py
/ detector.py) falls back to the heuristic placeholder. This is what
makes "train a model, drop the checkpoint in, flip a flag" work
without ever needing to edit classifier.py or detector.py by hand.
"""

from __future__ import annotations

import json
import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger("skinvision.model_loader")

# ml/ lives as a sibling of backend/ at the repo root. This only
# matters if a trained checkpoint is actually configured — heuristic
# mode never touches this.
_ML_DIR = Path(__file__).resolve().parents[3] / "ml"
if _ML_DIR.is_dir() and str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))


@lru_cache(maxsize=1)
def get_classifier() -> tuple[Any, list[str], Any] | None:
    """Returns (model, label_order, eval_transform) or None."""
    checkpoint_path = Path(settings.classifier_checkpoint_path)
    labels_path = checkpoint_path.parent / "labels.json"
    if not checkpoint_path.is_file() or not labels_path.is_file():
        logger.info(
            "models_are_trained is set but no classifier checkpoint found at %s — using heuristic classifier.",
            checkpoint_path,
        )
        return None

    try:
        import torch

        from model_defs import build_classifier_model_no_pretrained_download, build_eval_transforms
    except ImportError:
        logger.warning(
            "Classifier checkpoint found but torch/torchvision aren't installed "
            "(pip install -r ml/requirements.txt) — using heuristic classifier."
        )
        return None

    try:
        label_order: list[str] = json.loads(labels_path.read_text())
        model = build_classifier_model_no_pretrained_download(len(label_order))
        state_dict = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()
        logger.info("Loaded trained classifier from %s (%d labels).", checkpoint_path, len(label_order))
        return model, label_order, build_eval_transforms()
    except Exception:  # noqa: BLE001 - any load failure should degrade, not crash the API
        logger.exception("Failed to load trained classifier checkpoint — using heuristic classifier.")
        return None


@lru_cache(maxsize=1)
def get_detector() -> Any | None:
    """Returns a loaded ultralytics YOLO model, or None."""
    checkpoint_path = Path(settings.detector_checkpoint_path)
    if not checkpoint_path.is_file():
        logger.info(
            "models_are_trained is set but no detector checkpoint found at %s — using heuristic detector.",
            checkpoint_path,
        )
        return None

    try:
        from ultralytics import YOLO
    except ImportError:
        logger.warning(
            "Detector checkpoint found but ultralytics isn't installed "
            "(pip install -r ml/requirements.txt) — using heuristic detector."
        )
        return None

    try:
        model = YOLO(str(checkpoint_path))
        logger.info("Loaded trained detector from %s.", checkpoint_path)
        return model
    except Exception:  # noqa: BLE001
        logger.exception("Failed to load trained detector checkpoint — using heuristic detector.")
        return None
