"""
Verifies two things:

1. If `models_are_trained` is set but no checkpoint is present (or
   loading it fails for any reason), the app falls back to the
   heuristic path cleanly and reports that fallback accurately —
   never crashes, and never claims "trained" when it wasn't.
2. The real trained checkpoints actually shipped in
   backend/app/ml_models/ load successfully into this codebase's
   model architecture and produce valid output. This is the test that
   would have caught the classifier/detector label mismatch bug this
   file is named after fixing.

Every test that flips `config.settings` restores it in a `finally`
block so it can't leak state into other tests.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app import config
from app.services import classifier, detector
from app.services.model_loader import get_classifier, get_detector

_REAL_CLASSIFIER_CHECKPOINT = Path(config.settings.classifier_checkpoint_path)
_REAL_DETECTOR_CHECKPOINT = Path(config.settings.detector_checkpoint_path)


def test_get_classifier_returns_none_when_no_checkpoint_configured():
    get_classifier.cache_clear()
    original = config.settings.classifier_checkpoint_path
    config.settings.classifier_checkpoint_path = "/nonexistent/path/best.pt"
    try:
        assert get_classifier() is None
    finally:
        config.settings.classifier_checkpoint_path = original
        get_classifier.cache_clear()


def test_get_detector_returns_none_when_no_checkpoint_configured():
    get_detector.cache_clear()
    original = config.settings.detector_checkpoint_path
    config.settings.detector_checkpoint_path = "/nonexistent/path/best.pt"
    try:
        assert get_detector() is None
    finally:
        config.settings.detector_checkpoint_path = original
        get_detector.cache_clear()


def test_classify_falls_back_to_heuristic_and_says_so(sample_face_rgb):
    get_classifier.cache_clear()
    original_flag = config.settings.models_are_trained
    original_path = config.settings.classifier_checkpoint_path
    config.settings.models_are_trained = True
    config.settings.classifier_checkpoint_path = "/nonexistent/path/best.pt"
    try:
        concerns, source = classifier.classify(sample_face_rgb)
        assert source == "heuristic_placeholder"
        assert len(concerns) > 0
    finally:
        config.settings.models_are_trained = original_flag
        config.settings.classifier_checkpoint_path = original_path
        get_classifier.cache_clear()


def test_detect_lesions_falls_back_to_heuristic_and_says_so(sample_face_rgb):
    get_detector.cache_clear()
    original_flag = config.settings.models_are_trained
    original_path = config.settings.detector_checkpoint_path
    config.settings.models_are_trained = True
    config.settings.detector_checkpoint_path = "/nonexistent/path/best.pt"
    try:
        detections, source = detector.detect_lesions(
            sample_face_rgb, crop_offset=(0, 0), original_size=(200, 200)
        )
        assert source == "heuristic_placeholder"
        assert isinstance(detections, list)
    finally:
        config.settings.models_are_trained = original_flag
        config.settings.detector_checkpoint_path = original_path
        get_detector.cache_clear()


def test_classify_uses_heuristic_when_not_trained(sample_face_rgb):
    """Explicitly forces models_are_trained=False rather than assuming
    it — real checkpoints now ship in this repo, so that flag being
    True is a legitimate default in some environments (e.g. whenever
    backend/.env sets it, as it does after wiring in a trained model).
    This test is about the *dispatch logic*, not about what any given
    machine's .env happens to contain."""
    get_classifier.cache_clear()
    original_flag = config.settings.models_are_trained
    config.settings.models_are_trained = False
    try:
        concerns, source = classifier.classify(sample_face_rgb)
        assert source == "heuristic_placeholder"
        assert len(concerns) > 0
    finally:
        config.settings.models_are_trained = original_flag
        get_classifier.cache_clear()


def test_get_classifier_handles_a_corrupted_checkpoint_gracefully(tmp_path):
    """A checkpoint file exists but isn't a real, loadable checkpoint
    (corrupted download, wrong file, etc.) — loading must return None,
    not raise, regardless of whether torch itself is installed."""
    checkpoint = tmp_path / "best.pt"
    checkpoint.write_bytes(b"not a real checkpoint")
    (tmp_path / "labels.json").write_text("[]")

    get_classifier.cache_clear()
    original = config.settings.classifier_checkpoint_path
    config.settings.classifier_checkpoint_path = str(checkpoint)
    try:
        assert get_classifier() is None
    finally:
        config.settings.classifier_checkpoint_path = original
        get_classifier.cache_clear()


# --- Tests against the real shipped checkpoints, when present ----------
# These are skipped (not failed) if the checkpoint files aren't there —
# e.g. a fresh clone before anyone has trained/copied models in yet.

_have_real_classifier = _REAL_CLASSIFIER_CHECKPOINT.is_file()
_have_real_detector = _REAL_DETECTOR_CHECKPOINT.is_file()


@pytest.mark.skipif(not _have_real_classifier, reason="no trained classifier checkpoint shipped")
def test_real_classifier_checkpoint_loads(sample_face_rgb):
    get_classifier.cache_clear()
    original = config.settings.models_are_trained
    config.settings.models_are_trained = True
    try:
        concerns, source = classifier.classify(sample_face_rgb)
        assert source == "trained"
        # All 9 canonical labels should be represented, since this
        # checkpoint's labels.json matches CONCERN_LABELS exactly.
        assert len(concerns) == 9
        assert all(0.0 <= c.probability <= 1.0 for c in concerns)
    finally:
        config.settings.models_are_trained = original
        get_classifier.cache_clear()


@pytest.mark.skipif(not _have_real_detector, reason="no trained detector checkpoint shipped")
def test_real_detector_checkpoint_loads_and_returns_valid_schema(sample_face_rgb):
    """The specific bug this test file is named after: the shipped
    detector's classes (blackheads, dark spot, nodules, papules,
    pustules, whiteheads) must round-trip through the Detection schema
    without a Pydantic validation error, whatever they're actually
    called."""
    get_detector.cache_clear()
    original = config.settings.models_are_trained
    config.settings.models_are_trained = True
    try:
        detections, source = detector.detect_lesions(
            sample_face_rgb, crop_offset=(0, 0), original_size=(200, 200)
        )
        assert source == "trained"
        assert isinstance(detections, list)  # didn't raise — that's the main assertion
        for d in detections:
            assert 0.0 <= d.confidence <= 1.0
            assert isinstance(d.cls, str) and d.cls != ""
    finally:
        config.settings.models_are_trained = original
        get_detector.cache_clear()
