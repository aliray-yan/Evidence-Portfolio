"""Exact-duplicate preparation must preserve provenance and holdout boundaries."""
import json
from pathlib import Path
import shutil
import tempfile

import pytest

from sentinel_ml.video import sha256
from training.curation import curate
from training.data import inventory
from training.smoke import make_fixture


@pytest.fixture
def dataset(tmp_path):
    root = tmp_path / "source"
    make_fixture(root)
    return root


def add_copy(dataset, split="train", destination_split=None, destination_label="Fight"):
    source = dataset / split / "Fight/synthetic-0.avi"
    duplicate = dataset / (destination_split or split) / destination_label / "zz-copy.avi"
    shutil.copyfile(source, duplicate)
    return source, duplicate


@pytest.mark.parametrize("split", ["train", "val"])
def test_same_label_same_split_dedup_preserves_source_and_split(dataset, tmp_path, split):
    source, duplicate = add_copy(dataset, split)
    before = {p.relative_to(dataset).as_posix(): sha256(p) for p in dataset.rglob("*.avi")}
    curated = curate(dataset, tmp_path / "curated")
    report = json.loads((curated / "curation.json").read_text())
    assert report["source_count"] == 13 and report["kept_count"] == 12
    assert report["excluded_count"] == 1
    assert report["kept_counts"] == {"train": 8, "test": 4}
    assert report["excluded"] == [{
        "kept": source.relative_to(dataset).as_posix(),
        "excluded": duplicate.relative_to(dataset).as_posix(),
        "sha256": sha256(source), "source_split": "train" if split == "train" else "test", "label": "fight",
        "reason": "same_split_duplicate",
    }]
    assert before == {p.relative_to(dataset).as_posix(): sha256(p) for p in dataset.rglob("*.avi")}
    rows = inventory(curated)
    assert len(rows) == 12 and len({r["sha256"] for r in rows}) == 12
    assert all(r["relative"].startswith("val/") == (r["split"] == "test") for r in rows)
    second = curate(dataset, tmp_path / "curated-again")
    assert report == json.loads((second / "curation.json").read_text())


@pytest.mark.parametrize("destination_split,destination_label,error", [
    ("val", "Fight", "train/holdout"),
    ("train", "NonFight", "Conflicting labels"),
])
def test_unsafe_duplicates_stop_before_view_creation(dataset, tmp_path, destination_split, destination_label, error):
    add_copy(dataset, destination_split=destination_split, destination_label=destination_label)
    with pytest.raises(ValueError, match=error):
        curate(dataset, tmp_path / "curated")
    assert not (tmp_path / "curated").exists()
    with pytest.raises(ValueError, match="Duplicate"):
        inventory(dataset)


@pytest.mark.parametrize("problem", ["conflicting_ids", "cross_split", "missing"])
def test_group_provenance_is_checked_before_dedup(dataset, tmp_path, problem):
    source, duplicate = add_copy(dataset)
    source_name, duplicate_name = (p.relative_to(dataset).as_posix() for p in (source, duplicate))
    groups = {p.relative_to(dataset).as_posix(): p.relative_to(dataset).as_posix() for p in dataset.rglob("*.avi")}
    groups[duplicate_name] = groups[source_name]
    if problem == "conflicting_ids":
        groups[duplicate_name] = "different-session"
        error = "conflicting source/session groups"
    elif problem == "cross_split":
        groups["val/Fight/synthetic-0.avi"] = groups[source_name]
        error = "crosses train"
    else:
        del groups[duplicate_name]
        error = "Missing source/session group"
    groups_file = tmp_path / "groups.json"
    groups_file.write_text(json.dumps(groups))
    with pytest.raises(ValueError, match=error):
        curate(dataset, tmp_path / "curated", groups_file)
    assert not (tmp_path / "curated").exists()


def test_compatible_groups_survive_curation(dataset, tmp_path):
    source, duplicate = add_copy(dataset)
    groups = {p.relative_to(dataset).as_posix(): p.relative_to(dataset).as_posix() for p in dataset.rglob("*.avi")}
    groups[duplicate.relative_to(dataset).as_posix()] = groups[source.relative_to(dataset).as_posix()]
    groups_file = tmp_path / "groups.json"
    groups_file.write_text(json.dumps(groups))
    curated = curate(dataset, tmp_path / "curated", groups_file)
    assert len(inventory(curated, groups_file=groups_file)) == 12


def test_holdout_priority_removes_all_matching_training_copies(dataset, tmp_path):
    source, duplicate = add_copy(dataset, destination_split="val")
    shutil.copyfile(source, source.parent / "zz-second-copy.avi")
    original = {p.relative_to(dataset).as_posix(): sha256(p) for p in dataset.rglob("*.avi")}
    curated = curate(dataset, tmp_path / "curated", overlap_policy="keep_holdout")
    report = json.loads((curated / "curation.json").read_text())
    assert report["training_overlap_exclusions"] == 2
    assert report["kept_counts"] == {"train": 7, "test": 5}
    assert all(r["kept"] == duplicate.relative_to(dataset).as_posix() for r in report["excluded"])
    rows = inventory(curated)
    assert all(r["split"] == "test" for r in rows if r["sha256"] == sha256(source))
    assert len({r["sha256"] for r in rows}) == len(rows)
    assert original == {p.relative_to(dataset).as_posix(): sha256(p) for p in dataset.rglob("*.avi")}


def test_holdout_policy_still_rejects_conflicting_labels(dataset, tmp_path):
    add_copy(dataset, destination_split="val", destination_label="NonFight")
    with pytest.raises(ValueError, match="Conflicting labels"):
        curate(dataset, tmp_path / "curated", overlap_policy="keep_holdout")


def test_sources_and_existing_experiments_cannot_be_overwritten(dataset, tmp_path):
    with pytest.raises(ValueError, match="outside"):
        curate(dataset, dataset / "curated")
    existing = tmp_path / "existing"
    existing.mkdir()
    (existing / "keep.txt").write_text("previous experiment")
    with pytest.raises(ValueError, match="empty destination"):
        curate(dataset, existing)
    assert (existing / "keep.txt").read_text() == "previous experiment"


def test_generated_recovery_runs_in_existing_notebook_and_is_repeatable(dataset, tmp_path, monkeypatch):
    add_copy(dataset)
    root = Path(__file__).resolve().parents[1]
    source = (root / "training/Kaggle_duplicate_recovery.py").read_text(encoding="utf-8")
    assert (root / "training/curation.py").read_text(encoding="utf-8") in source
    original_mkdtemp = tempfile.mkdtemp
    monkeypatch.setattr(tempfile, "mkdtemp", lambda prefix, dir: original_mkdtemp(prefix=prefix, dir=tmp_path))
    namespace = {"dataset": dataset, "OUTPUT": tmp_path / "model", "GROUPS_FILE": None,
                 "DATASET_NAME": "synthetic unit fixture", "VERSION": "unit-test"}
    exec(compile(source, "recovery-cell", "exec"), namespace)
    curated = namespace["dataset"]
    report_file = tmp_path / "model-curation.json"
    report = json.loads(report_file.read_text())
    assert report["excluded_count"] == 1 and report["source_dataset_name"] == "synthetic unit fixture"
    assert len(inventory(curated)) == 12
    exec(compile(source, "recovery-cell-repeat", "exec"), namespace)
    assert namespace["dataset"] == curated
    assert json.loads(report_file.read_text()) == report
