import numpy as np
import pytest


@pytest.fixture
def sample_face_rgb() -> np.ndarray:
    """A synthetic RGB array standing in for a cropped face — good
    enough to exercise the classifier/detector code paths without
    needing a real photo (see tests/test_analyze.py for why we avoid
    bundling one)."""
    rng = np.random.default_rng(42)
    return rng.integers(0, 255, size=(200, 200, 3), dtype=np.uint8)
