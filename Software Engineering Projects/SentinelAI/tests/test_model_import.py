"""Import validation uses tiny record fixtures; actual trained import is checked separately."""
import json
import zipfile
import pytest
from backend.model_import import extract_export, verify_records, FILES
from backend.config import selected_violence_model
from sentinel_ml.video import PREPROCESS, sha256
from training.data import metrics


@pytest.fixture
def bundle(tmp_path):
    root = tmp_path / "bundle"
    root.mkdir()
    rows = [{"relative": f"{split}/{label}.avi", "split": split, "label": label,
             "sha256": f"{index:064x}", "group": f"source-{index}"}
            for index, (split, label) in enumerate((s, l) for s in ("train", "dev", "test") for l in (0, 1))]
    predictions = [{"relative": f"test/{label}.avi", "label": label, "score": .1 if label == 0 else .9} for label in (0, 1)]
    (root / "split.json").write_text(json.dumps(rows))
    (root / "test_predictions.json").write_text(json.dumps(predictions))
    (root / "weights.pt").write_bytes(b"test-only structural fixture; not loadable weights")
    (root / "curation.json").write_text(json.dumps({"source_count": 6, "kept_count": 6, "excluded_count": 0, "excluded": []}))
    (root / "history.json").write_text("[]")
    manifest = {"schema": 1, "architecture": "torchvision-r3d_18", "version": "test-fixture", "purpose": "research_trained",
                "labels": ["nonfight", "fight"], "preprocess": PREPROCESS, "weights": "weights.pt", "sha256": sha256(root / "weights.pt"),
                "threshold": .7, "evaluation": metrics([0, 1], [.1, .9], .7),
                "training": {"dataset": "test fixture only", "counts": {"train": 2, "dev": 2, "test": 2},
                             "split_sha256": sha256(root / "split.json"), "curation_sha256": sha256(root / "curation.json")}}
    (root / "manifest.json").write_text(json.dumps(manifest))
    return root


def test_records_recompute_metrics_and_checksums(bundle):
    manifest, report = verify_records(bundle)
    assert report["evaluation_recomputed"] == manifest["evaluation"]
    assert report["unique_exported_hashes"] == 6


@pytest.mark.parametrize("problem", ["hash", "overlap", "group", "metrics", "prediction_label", "curation"])
def test_misleading_export_provenance_rejected(bundle, problem):
    manifest = json.loads((bundle / "manifest.json").read_text())
    rows = json.loads((bundle / "split.json").read_text())
    if problem == "hash":
        (bundle / "weights.pt").write_bytes(b"different")
    elif problem in ("overlap", "group"):
        key = "sha256" if problem == "overlap" else "group"
        rows[-1][key] = rows[0][key]
        (bundle / "split.json").write_text(json.dumps(rows))
        manifest["training"]["split_sha256"] = sha256(bundle / "split.json")
    elif problem == "metrics":
        manifest["evaluation"]["f1"] = .1
    elif problem == "curation":
        (bundle / "curation.json").write_text("{}")
    else:
        predictions = json.loads((bundle / "test_predictions.json").read_text())
        predictions[0]["label"] = 1
        (bundle / "test_predictions.json").write_text(json.dumps(predictions))
    (bundle / "manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError):
        verify_records(bundle)


@pytest.mark.parametrize("extra", ["../outside.py", "/absolute.py", "nested/file", "weights.pt"])
def test_archive_rejects_paths_extra_files_and_duplicates(bundle, tmp_path, extra):
    path = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(path, "w") as archive:
        for name in FILES:
            archive.write(bundle / name, name)
        archive.writestr(extra, "untrusted")
    with pytest.raises(ValueError, match="exactly"):
        extract_export(path, tmp_path / "output")
    assert not (tmp_path / "output").exists()


def test_selection_is_explicit_bounded_and_environment_overridable(bundle, tmp_path, monkeypatch):
    import backend.config as config
    monkeypatch.setattr(config, "ROOT", tmp_path)
    monkeypatch.delenv("SENTINEL_VIOLENCE_MODEL", raising=False)
    assert selected_violence_model() == ""
    model = tmp_path / ".local/models/fixture"
    model.parent.mkdir(parents=True)
    bundle.rename(model)
    manifest = json.loads((model / "manifest.json").read_text())
    selected = tmp_path / ".local/model-selection.json"
    selected.write_text(json.dumps({"directory": ".local/models/fixture", "sha256": manifest["sha256"], "version": manifest["version"]}))
    assert selected_violence_model() == str(model.resolve())
    monkeypatch.setenv("SENTINEL_VIOLENCE_MODEL", "")
    assert selected_violence_model() == ""
    monkeypatch.delenv("SENTINEL_VIOLENCE_MODEL")
    selected.write_text(json.dumps({"directory": "../outside"}))
    with pytest.raises(ValueError, match="inside"):
        selected_violence_model()
