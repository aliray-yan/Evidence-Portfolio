"""Install a trusted Kaggle export after structural and provenance checks.

Never executes the notebook. Weights load only through the fixed architecture and
PyTorch's tensor-only loader. This checks reproducibility, not dataset authenticity.
"""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import shutil
import tempfile
import zipfile

from .config import ROOT
from sentinel_ml.bundle import load_network, manifest_at
from sentinel_ml.video import sha256
from training.data import metrics

FILES = {"manifest.json": 65536, "weights.pt": 160 * 1024**2,
         "split.json": 20 * 1024**2, "history.json": 1024**2,
         "test_predictions.json": 10 * 1024**2, "curation.json": 10 * 1024**2}


def extract_export(archive, destination):
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if {i.filename for i in entries} != set(FILES) or len(entries) != len(FILES):
            raise ValueError("Expected exactly the six files from the SentinelAI Kaggle export; no paths or extra files are accepted.")
        for info in entries:
            if not 0 < info.file_size <= FILES[info.filename] or info.flag_bits & 1:
                raise ValueError("Archive member is empty, encrypted or exceeds its size limit.")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Linked archive members are not accepted.")
        destination = Path(destination)
        destination.mkdir(parents=True, exist_ok=True)
        for info in entries:
            with source.open(info) as src, (destination / info.filename).open("xb") as dst:
                remaining = FILES[info.filename]
                while block := src.read(min(1024**2, remaining + 1)):
                    remaining -= len(block)
                    if remaining < 0:
                        raise ValueError("Expanded archive member exceeds its size limit.")
                    dst.write(block)


def verify_records(directory):
    directory = Path(directory)
    manifest = manifest_at(directory)
    training = manifest["training"]
    for filename, key in (("split.json", "split_sha256"), ("curation.json", "curation_sha256")):
        if sha256(directory / filename) != training.get(key):
            raise ValueError(f"Training provenance checksum mismatch: {filename}.")
    rows = json.loads((directory / "split.json").read_text(encoding="utf-8"))
    predictions = json.loads((directory / "test_predictions.json").read_text(encoding="utf-8"))
    curation = json.loads((directory / "curation.json").read_text(encoding="utf-8"))
    if not rows or len({r["relative"] for r in rows}) != len(rows) or len({r["sha256"] for r in rows}) != len(rows):
        raise ValueError("Split contains duplicate filenames or content hashes.")
    counts = {s: sum(r["split"] == s for r in rows) for s in ("train", "dev", "test")}
    if counts != training.get("counts") or sum(counts.values()) != len(rows):
        raise ValueError("Split counts do not match training provenance.")
    groups = {}
    for row in rows:
        if row["label"] not in (0, 1) or not row.get("group"):
            raise ValueError("Invalid split labels or source groups.")
        if row["group"] in groups and groups[row["group"]] != row["split"]:
            raise ValueError("Source groups cross train/development/test boundaries.")
        groups[row["group"]] = row["split"]
    if any({r["label"] for r in rows if r["split"] == s} != {0, 1} for s in counts):
        raise ValueError("Each split needs both classes.")
    heldout = {r["relative"]: r for r in rows if r["split"] == "test"}
    if len(predictions) != len(heldout) or {r["relative"] for r in predictions} != set(heldout):
        raise ValueError("Test predictions are not a one-to-one match for the holdout.")
    for prediction in predictions:
        if prediction["label"] != heldout[prediction["relative"]]["label"] or not math.isfinite(prediction["score"]) or not 0 <= prediction["score"] <= 1:
            raise ValueError("Invalid test prediction or label mismatch.")
    measured = metrics([p["label"] for p in predictions], [p["score"] for p in predictions], manifest["threshold"])
    for key, value in measured.items():
        claimed = manifest["evaluation"].get(key)
        if isinstance(value, float):
            if not isinstance(claimed, (int, float)) or not math.isclose(value, claimed, rel_tol=1e-8):
                raise ValueError(f"Saved predictions do not reproduce {key}.")
        elif value != claimed:
            raise ValueError(f"Saved predictions do not reproduce {key}.")
    excluded = curation.get("excluded", [])
    if curation.get("kept_count") != len(rows) or curation.get("excluded_count") != len(excluded) or curation.get("source_count") != len(rows) + len(excluded):
        raise ValueError("Curation counts disagree with the exported split.")
    by_name = {r["relative"]: r for r in rows}
    for entry in excluded:
        if entry["excluded"] in by_name or entry["kept"] not in by_name or entry["sha256"] != by_name[entry["kept"]]["sha256"]:
            raise ValueError("Curation references do not match retained evidence.")
        if entry.get("reason") == "train_holdout_overlap" and by_name[entry["kept"]]["split"] != "test":
            raise ValueError("Overlap curation did not preserve the held-out copy.")
    return manifest, {"verified_at": datetime.now(timezone.utc).isoformat(), "evaluation_recomputed": measured,
                      "counts": counts, "unique_exported_hashes": len(rows),
                      "excluded_duplicates": len(excluded), "source_grouped": training.get("grouped", False),
                      "limitations": "Verified against exported records only; original dataset, near-duplicates and local-domain accuracy are not independently verified."}


def install(archive, root=ROOT, activate=False):
    root = Path(root)
    models = root / ".local/models"
    models.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="model-import-", dir=models) as temp:
        staging = Path(temp)
        extract_export(archive, staging)
        manifest, report = verify_records(staging)
        import torch
        torch.set_num_threads(2)
        network, _ = load_network(staging)
        with torch.inference_mode():
            output = network(torch.zeros(1, 3, 16, 112, 112))
        if tuple(output.shape) != (1, 2) or not torch.isfinite(output).all():
            raise ValueError("Model failed the local structural inference check.")
        report["local_tensor_inference"] = "passed; synthetic zero input, not an accuracy test"
        report["archive_sha256"] = sha256(archive)
        target = models / (manifest["version"] + "-" + manifest["sha256"][:12])
        if target.exists():
            if any(sha256(target / name) != sha256(staging / name) for name in FILES):
                raise ValueError("Existing installation differs; preserved without overwrite.")
        else:
            staging.rename(target)
        (target / "local-verification.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if activate:
        selection = {"directory": target.relative_to(root).as_posix(), "sha256": manifest["sha256"], "version": manifest["version"]}
        temp_selection = root / ".local/model-selection.tmp"
        temp_selection.write_text(json.dumps(selection, indent=2), encoding="utf-8")
        temp_selection.replace(root / ".local/model-selection.json")
    return target, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive")
    parser.add_argument("--activate", action="store_true", help="Select this verified bundle for subsequent server starts; explicit environment setting takes precedence")
    args = parser.parse_args()
    target, report = install(args.archive, activate=args.activate)
    print(json.dumps({"installed": str(target), "selected_for_next_start": args.activate, "verification": report}, indent=2))


if __name__ == "__main__":
    main()
