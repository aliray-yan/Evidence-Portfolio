"""
These tests deliberately avoid bundling a real photo of a person's
face in the repository — that would conflict with the product's own
privacy stance (PRD rule 12/13). The "face detected" path is exercised
manually with a consenting test photo that is never committed; what's
covered here is everything that doesn't require one: validation rules
and the no-face branch of the quality gate.
"""

from __future__ import annotations

import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _noise_jpeg_bytes(size: tuple[int, int] = (300, 300)) -> bytes:
    arr = np.random.randint(0, 255, (size[1], size[0], 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="JPEG")
    return buf.getvalue()


def test_no_face_image_is_reported_unusable():
    files = {"image": ("noise.jpg", _noise_jpeg_bytes(), "image/jpeg")}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["quality"]["face_count"] == 0
    assert body["quality"]["usable"] is False
    assert body["concerns"] == []
    assert body["detections"] == []
    assert any(w["code"] == "no_face_detected" for w in body["quality"]["warnings"])


def test_rejects_unsupported_content_type():
    files = {"image": ("note.txt", b"not an image", "text/plain")}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 415


def test_rejects_oversized_file():
    big = b"0" * (11 * 1024 * 1024)  # 11 MB, over the 10 MB limit
    files = {"image": ("big.jpg", big, "image/jpeg")}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 413


def test_rejects_corrupted_image():
    files = {"image": ("broken.jpg", b"\xff\xd8not-a-real-jpeg", "image/jpeg")}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 400


def test_rejects_empty_file():
    files = {"image": ("empty.jpg", b"", "image/jpeg")}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 400


def test_model_status_reports_heuristic_when_not_trained():
    from app import config

    original = config.settings.models_are_trained
    config.settings.models_are_trained = False
    try:
        files = {"image": ("noise.jpg", _noise_jpeg_bytes(), "image/jpeg")}
        resp = client.post("/analyze", files=files)
        body = resp.json()
        assert body["model_status"]["classifier"] == "heuristic_placeholder"
        assert body["model_status"]["detector"] == "heuristic_placeholder"
    finally:
        config.settings.models_are_trained = original


def test_model_status_never_lies_about_an_unusable_image():
    """No face means nothing actually ran (classifier/detector are
    never called for an unusable image — see FR-03 in routers/analyze.py),
    so model_status here reports what *would* run based on config,
    which is a documented, narrower exception to "reflects what
    actually ran" — see the comment in routers/analyze.py."""
    from app import config

    original = config.settings.models_are_trained
    config.settings.models_are_trained = True
    try:
        files = {"image": ("noise.jpg", _noise_jpeg_bytes(), "image/jpeg")}
        resp = client.post("/analyze", files=files)
        body = resp.json()
        assert body["quality"]["usable"] is False
        assert body["model_status"]["classifier"] == "trained"
        assert body["model_status"]["detector"] == "trained"
    finally:
        config.settings.models_are_trained = original
