"""Provenance for explicitly installed local AI assets."""
import json
from pathlib import Path
from sentinel_ml.video import sha256
from .config import ROOT


def local_mediapipe():
    from importlib.metadata import version
    if version('mediapipe') != '0.10.21':
        raise ValueError('Use the pinned MediaPipe version in requirements-ai.txt. Newer vendor wheels can send usage telemetry.')
    import mediapipe
    return mediapipe


def model_identity(path):
    path = Path(path).resolve()
    if path.is_dir() and (path / 'installation.json').is_file():
        from .exchange_import import verify_installation
        return verify_installation(path)
    if path.is_dir() and (path / 'manifest.json').is_file():
        kind = json.loads((path / 'manifest.json').read_text(encoding='utf-8')).get('kind')
        bundles = {'anonymous_diarization': ('model.onnx', 'speaker.onnx'), 'multilingual_retrieval': ('model.onnx', 'tokenizer.json')}
        if kind in bundles:
            from .language_assets import bundle_identity
            return bundle_identity(path, kind, bundles[kind])
    files = [path] if path.is_file() else [path/name for name in ("config.json", "model.bin", "tokenizer.json", "vocabulary.txt")]
    hashes = {p.name: sha256(p) for p in files}
    selection = ROOT / ".local/ai-selection.json"
    if selection.exists():
        for item in json.loads(selection.read_text(encoding="utf-8")).get("models", {}).values():
            if (ROOT / item["path"]).resolve() == path:
                if hashes != item["files"]:
                    raise ValueError("Installed AI model checksum mismatch. Restore the selected model before processing.")
                return {"name": path.name, "files": hashes, "source": item["source"], "revision": item.get("revision")}
    return {"name": path.name, "files": hashes, "source": "Operator-supplied local model"}
