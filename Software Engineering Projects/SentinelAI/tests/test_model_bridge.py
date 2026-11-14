"""Fixtures below test plumbing, never detector accuracy or pretrained behavior."""
import json
from pathlib import Path
import shutil
import numpy as np
import pytest
from sentinel_ml.video import PREPROCESS, read_clip, sha256, windows
from sentinel_ml.bundle import manifest_at, configured_status
from training.data import inventory, choose_threshold, metrics, dataset_roots, find_root
from training.smoke import make_fixture


@pytest.fixture
def video_dataset(tmp_path):
    make_fixture(tmp_path/"data")
    return tmp_path/"data"


def fake_bundle(root, purpose="research_trained"):
    root.mkdir()
    (root/"weights.pt").write_bytes(b"TEST FIXTURE ONLY; not loadable PyTorch weights")
    manifest = {"schema": 1, "architecture": "torchvision-r3d_18", "version": "unit-fixture", "labels": ["nonfight", "fight"],
                "preprocess": PREPROCESS, "purpose": purpose, "threshold": .7, "weights": "weights.pt",
                "sha256": sha256(root/"weights.pt"), "training": {"dataset": "unit fixture"}, "evaluation": {"count": 2}}
    (root/"manifest.json").write_text(json.dumps(manifest))
    return manifest


def test_uniform_clip_contract_and_window_bounds(video_dataset):
    tensor = read_clip(next(video_dataset.rglob("*.avi")))
    assert tensor.shape == (3, 16, 112, 112) and tensor.dtype == np.float32
    assert tensor.flags.c_contiguous and np.isfinite(tensor).all()
    assert windows(12) == [(0., 5.), (5., 10.), (10., 12)]
    assert len(windows(120)) == 24
    with pytest.raises(ValueError):
        windows(121)


def test_split_reproducible_and_test_untouched(video_dataset):
    first = inventory(video_dataset)
    assert first == inventory(video_dataset)
    for split in ("train", "dev", "test"):
        assert {r["label"] for r in first if r["split"] == split} == {0, 1}
    assert all(r["relative"].startswith("val/") == (r["split"] == "test") for r in first)
    assert len({r["sha256"] for r in first}) == len(first)


def test_cross_split_duplicate_rejected(video_dataset):
    shutil.copyfile(video_dataset/"train/Fight/synthetic-0.avi", video_dataset/"val/Fight/synthetic-0.avi")
    with pytest.raises(ValueError, match="Duplicate"):
        inventory(video_dataset)


def test_source_group_leakage_rejected(video_dataset, tmp_path):
    groups = {p.relative_to(video_dataset).as_posix(): p.relative_to(video_dataset).as_posix() for p in video_dataset.rglob("*.avi")}
    groups["train/Fight/synthetic-0.avi"] = groups["val/Fight/synthetic-0.avi"] = "same-camera-session"
    group_file = tmp_path/"groups.json"
    group_file.write_text(json.dumps(groups))
    with pytest.raises(ValueError, match="crosses"):
        inventory(video_dataset, groups_file=group_file)


def test_collection_requires_explicit_subset(tmp_path):
    for name in ("RLVS", "RWF-2000"):
        make_fixture(tmp_path/"collection"/name)
    roots = dataset_roots(tmp_path/"collection")
    assert {p.name for p in roots} == {"RLVS", "RWF-2000"}
    with pytest.raises(ValueError, match="subset"):
        find_root(tmp_path/"collection")
    assert len(inventory(tmp_path/"collection/RWF-2000")) == 12


def test_metrics_threshold_uses_passed_development_data():
    result = metrics([0, 0, 1, 1], [.1, .8, .7, .9], .6)
    assert result["confusion_matrix"] == [[1, 1], [0, 2]]
    assert result["precision"] == pytest.approx(2/3)
    assert choose_threshold([0, 1], [.2, .8])["threshold"] == .8


@pytest.mark.parametrize("change", [{"purpose": "test_only"}, {"architecture": "arbitrary"}, {"threshold": float("nan")},
                                   {"labels": ["fight", "nonfight"]}, {"weights": "../weights.pt"}, {"preprocess": {}}, {"evaluation": {"count": 0}}])
def test_incompatible_bundles_rejected(tmp_path, change):
    root = tmp_path/"bundle"
    data = fake_bundle(root)
    data.update(change)
    (root/"manifest.json").write_text(json.dumps(data))
    with pytest.raises(ValueError):
        manifest_at(root)


def test_checksum_rejected_and_missing_status(tmp_path):
    root = tmp_path/"bundle"
    fake_bundle(root)
    (root/"weights.pt").write_bytes(b"tampered")
    with pytest.raises(ValueError, match="checksum"):
        manifest_at(root)
    assert configured_status("")[0] == "unavailable"


def test_actual_adapter_timestamp_score_and_policy(monkeypatch, video_dataset):
    torch = pytest.importorskip("torch")
    from backend.vision import LocalViolence
    from backend.intelligence import fuse
    # Explicit deterministic test network, not a claimed trained detector.
    class Fixture(torch.nn.Module):
        def forward(self, value):
            assert tuple(value.shape) == (1, 3, 16, 112, 112)
            return torch.tensor([[0., 2.]])
    manifest = {"threshold": .7, "version": "test-only", "sha256": "0"*64, "architecture": "fixture"}
    monkeypatch.setattr("backend.vision.load_network", lambda _: (Fixture(), manifest))
    analyzer = LocalViolence("fixture")
    events = analyzer.analyze(str(next(video_dataset.rglob("*.avi"))))
    assert len(events) == 1 and events[0]["start"] == 0 and events[0]["end"] == pytest.approx(.4)
    assert events[0]["confidence"] == pytest.approx(.880797, abs=1e-6)
    assert "safety" not in events[0]["signals"]
    policy = {"low": 10, "ambiguous": 30, "high": 60, "emergency": 85, "weights": {"speech": .3, "gesture": .15, "body": .15, "context": .25, "temporal": .15}}
    assert fuse(events, policy)["label"] == "Ambiguous"
    manifest["threshold"] = .99
    assert analyzer.analyze(str(next(video_dataset.rglob("*.avi")))) == []
    assert len(analyzer.last_report["windows"]) == 1


def test_real_architecture_tensor_bundle_roundtrip(tmp_path):
    torch = pytest.importorskip("torch")
    pytest.importorskip("torchvision")
    from torchvision.models.video import r3d_18
    from sentinel_ml.bundle import load_network
    torch.set_num_threads(2)
    root = tmp_path/"structural-fixture"
    manifest = fake_bundle(root)
    # Random tensors exercise the export contract only. The temporary fixture's
    # schema fields are test inputs; it is never installed or claimed as trained.
    network = r3d_18(weights=None)
    network.fc = torch.nn.Linear(network.fc.in_features, 2)
    with torch.no_grad():
        network.fc.bias.fill_(.125)
    torch.save(network.state_dict(), root/"weights.pt")
    manifest["sha256"] = sha256(root/"weights.pt")
    (root/"manifest.json").write_text(json.dumps(manifest))
    del network
    loaded, verified = load_network(root)
    assert verified["sha256"] == manifest["sha256"]
    assert not loaded.training and torch.all(loaded.fc.bias == .125)
    with torch.inference_mode():
        result = loaded(torch.zeros(1, 3, 16, 112, 112))
    assert tuple(result.shape) == (1, 2) and torch.isfinite(result).all()


def test_model_pipeline_persists_evidence_alert_and_failure(application, login, tmp_path, monkeypatch):
    from backend.pipeline import run_ffmpeg
    make_fixture(tmp_path/"fixture")
    source = tmp_path/"upload.mp4"
    run_ffmpeg(["-i", str(tmp_path/"fixture/train/Fight/synthetic-0.avi"), "-c:v", "libx264", str(source)])
    class FixtureDetector:
        last_report = {"version": "test-fixture", "sha256": "1"*64, "windows": [{"start": 0, "end": .4, "score": .8}]}
        def analyze(self, path):
            return [{"start": 0, "end": .4, "kind": "visual", "title": "Test fixture review cue", "detail": "Synthetic test network output; no detector quality claim.", "confidence": .8, "source": "model", "references": [], "signals": {"body": 80, "context": 40}}]
    monkeypatch.setattr(application.state.config, "violence_model", "fixture")
    monkeypatch.setattr(application.state.processor, "vision", FixtureDetector())
    client = login("citizen")
    response = client.post("/api/cases/upload", data={"title": "Model integration fixture", "consent": "true"}, files={"file": ("test.mp4", source.read_bytes(), "video/mp4")})
    assert response.status_code == 201, response.text
    case_id = response.json()["id"]
    while application.state.processor.run_once():
        pass
    result = client.get("/api/cases/"+case_id).json()
    assert result["processing_status"] == "partial", result.get("processing_error")
    assert result["risk_label"] == "Ambiguous"
    assert result["assessment"]["vision"]["version"] == "test-fixture"
    assert result["events"][0]["confidence"] == .8
    assert set(result["events"][0]["references"]) == {e["id"] for e in result["evidence"]}
    assert result["alerts"][0]["kind"] == "possible_conflict"
    assert result["alerts"][0]["event_id"] == result["events"][0]["id"]
    # A second, distinct upload with an invalid configured bundle must retain source.
    source2 = tmp_path/"upload2.mp4"
    run_ffmpeg(["-i", str(tmp_path/"fixture/train/Fight/synthetic-1.avi"), "-c:v", "libx264", str(source2)])
    monkeypatch.setattr(application.state.processor, "vision", None)
    response = client.post("/api/cases/upload", data={"title": "Broken model fixture", "consent": "true"}, files={"file": ("test2.mp4", source2.read_bytes(), "video/mp4")})
    assert response.status_code == 201
    failed_id = response.json()["id"]
    while application.state.processor.run_once():
        pass
    failed = client.get("/api/cases/"+failed_id).json()
    assert failed["processing_status"] == "failed" and failed["can_retry"]
    assert "Configured vision analysis failed" in failed["processing_error"]
    assert not failed["events"]
    with application.state.db.connect() as con:
        assert con.execute("SELECT 1 FROM evidence WHERE case_id=? AND kind='original'", (failed_id,)).fetchone()


def test_notebook_self_contained_sources_and_code():
    root = Path(__file__).resolve().parents[1]
    notebook = json.loads((root/"training/SentinelAI_RWF2000_Kaggle.ipynb").read_text(encoding="utf-8"))
    for index, cell in enumerate(notebook["cells"]):
        if cell["cell_type"] == "code":
            compile("".join(cell["source"]), f"notebook-cell-{index}", "exec")
            assert cell["execution_count"] is None and cell["outputs"] == []
    source_cell = "".join(notebook["cells"][1]["source"])
    import ast
    assignments = [n for n in ast.parse(source_cell).body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "FILES" for t in n.targets)]
    for name, source in ast.literal_eval(assignments[0].value).items():
        assert source == (root/name).read_text(encoding="utf-8")
