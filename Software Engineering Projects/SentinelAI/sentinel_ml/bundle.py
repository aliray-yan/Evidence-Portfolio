"""Versioned, fixed-architecture model bundle. Import only artifacts you trained/trust."""
from pathlib import Path
import importlib.util
import json
import math
import re
from .video import PREPROCESS, sha256


def manifest_at(directory, verify_hash=True):
    directory = Path(directory)
    manifest_file = directory / "manifest.json"
    if manifest_file.stat().st_size > 64 * 1024:
        raise ValueError("Model manifest is too large.")
    data = json.loads(manifest_file.read_text(encoding="utf-8"))
    if data.get("schema") != 1 or data.get("architecture") != "torchvision-r3d_18":
        raise ValueError("Unsupported model architecture or bundle version.")
    if data.get("labels") != ["nonfight", "fight"] or data.get("preprocess") != PREPROCESS:
        raise ValueError("Model labels or preprocessing do not match SentinelAI.")
    if data.get("purpose") != "research_trained":
        raise ValueError("Test-only or untrained bundles cannot be enabled for case analysis.")
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", data.get("version", "")):
        raise ValueError("Invalid model version.")
    threshold = data.get("threshold")
    if isinstance(threshold, bool) or not isinstance(threshold, (float, int)) or not math.isfinite(threshold) or not .05 <= threshold <= .99:
        raise ValueError("Model threshold must be between 0.05 and 0.99.")
    if data.get("weights") != "weights.pt" or not re.fullmatch(r"[0-9a-f]{64}", data.get("sha256", "")):
        raise ValueError("Invalid model artifact name or checksum.")
    if not isinstance(data.get("training"), dict) or not data["training"].get("dataset"):
        raise ValueError("Training provenance is required.")
    if not isinstance(data.get("evaluation"), dict) or data["evaluation"].get("count", 0) < 1:
        raise ValueError("Held-out evaluation results are required.")
    weights = directory / "weights.pt"
    if weights.is_symlink() or not weights.is_file() or not 1 <= weights.stat().st_size <= 160 * 1024**2:
        raise ValueError("Missing, linked, or oversized model weights.")
    if verify_hash and sha256(weights) != data["sha256"]:
        raise ValueError("Model checksum mismatch; import the complete export again.")
    return data


def configured_status(directory):
    if not directory:
        return "unavailable", "Train the Kaggle notebook and set SENTINEL_VIOLENCE_MODEL to its exported folder."
    try:
        data = manifest_at(directory, verify_hash=False)
        if not all(importlib.util.find_spec(m) for m in ("torch", "torchvision")):
            return "unavailable", "Model folder exists; install requirements-vision.txt in the server environment."
        return "configured", f"{data['version']}: research fight classifier configured. Load/checksum and inference are verified per job; domain validation is still required."
    except (OSError, ValueError, TypeError, AttributeError):
        return "unavailable", "Model folder is invalid or incomplete. Run python -m backend.model_check before using it."


def load_network(directory):
    import torch
    from torchvision.models.video import r3d_18
    data = manifest_at(directory)
    # No arbitrary model classes, remote code, TorchScript, or automatic downloads.
    state = torch.load(Path(directory) / "weights.pt", map_location="cpu", weights_only=True)
    if not isinstance(state, dict) or not all(isinstance(v, torch.Tensor) for v in state.values()):
        raise ValueError("Expected a tensor-only state dictionary.")
    model = r3d_18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(state, strict=True)
    if any(not torch.isfinite(v).all() for v in model.state_dict().values()):
        raise ValueError("Model weights contain invalid numbers.")
    model.eval()
    return model, data
