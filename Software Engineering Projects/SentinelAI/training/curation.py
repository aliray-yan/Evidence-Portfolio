"""Build a linked dataset view; keep originals and a record of every exclusion."""
import json
import os
from pathlib import Path
from sentinel_ml.video import sha256
from training.data import EXTENSIONS, find_root


def curate(root, destination, groups_file=None, overlap_policy="reject"):
    if overlap_policy not in ("reject", "keep_holdout"):
        raise ValueError("Choose reject or keep_holdout for exact train/holdout overlap.")
    root, destination = find_root(root).resolve(), Path(destination).resolve()
    if destination == root or destination.is_relative_to(root):
        raise ValueError("The curated view must be outside the source dataset.")
    if destination.exists() and any(destination.iterdir()):
        raise ValueError("Use an empty destination; existing experiments are never overwritten.")
    folders = {p.name.casefold(): p for p in root.iterdir() if p.is_dir()}
    if "val" in folders and "test" in folders:
        raise ValueError("Both val and test exist. Select an explicit two-split dataset first.")
    groups = json.loads(Path(groups_file).read_text()) if groups_file else {}
    seen, group_splits, kept, duplicates = {}, {}, [], []
    print(f"Checking exact duplicates in {root} ...", flush=True)
    splits = [("train", folders["train"]), ("test", folders.get("test", folders.get("val")))]
    if overlap_policy == "keep_holdout":
        # Holdout is inventoried first. Every matching training copy is excluded
        # before development splitting; no held-out video is moved into training.
        splits.reverse()
    for split, folder in splits:
        for video in sorted(folder.rglob("*")):
            if video.suffix.casefold() not in EXTENSIONS:
                continue
            relative = video.relative_to(root).as_posix()
            label = video.parent.name.casefold().replace("-", "").replace("_", "")
            if label not in ("fight", "nonfight"):
                raise ValueError(f"Unknown class folder: {relative}")
            if groups_file and relative not in groups:
                raise ValueError(f"Missing source/session group: {relative}")
            group = groups.get(relative, relative)
            if not isinstance(group, str) or not group:
                raise ValueError("Source/session groups must be nonempty strings.")
            if group in group_splits and group_splits[group] != split:
                raise ValueError("A source/session group crosses train and held-out data.")
            group_splits[group] = split
            digest = sha256(video)
            prior = seen.get(digest)
            if prior:
                if prior["label"] != label:
                    raise ValueError(f"Conflicting labels for identical videos: {prior['relative']} and {relative}.")
                cross_split = prior["split"] != split
                if cross_split and overlap_policy == "reject":
                    raise ValueError(f"Duplicate content crosses train/holdout boundary: {prior['relative']} and {relative}. Curate this overlap before training.")
                if groups_file and prior["group"] != group:
                    raise ValueError(f"Identical videos have conflicting source/session groups: {relative}.")
                duplicates.append({"kept": prior["relative"], "excluded": relative, "sha256": digest,
                                   "source_split": split, "label": label,
                                   "reason": "train_holdout_overlap" if cross_split else "same_split_duplicate"})
            else:
                row = {"relative": relative, "sha256": digest, "split": split, "label": label, "group": group}
                seen[digest] = row
                kept.append(row)
            checked = len(kept) + len(duplicates)
            if checked % 250 == 0:
                print(f"Checked {checked} videos; {len(duplicates)} redundant copies found.", flush=True)
    if not kept:
        raise ValueError("No supported video files found.")
    # Validate all hashes/labels/groups before creating any view. Do not edit,
    # delete, move or copy source videos. Kaggle supports links to /kaggle/input.
    destination.mkdir(parents=True, exist_ok=True)
    for row in kept:
        target = destination/row["relative"]
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            target.symlink_to(root/row["relative"])
        except OSError:
            # Windows local tests can use same-volume hard links without symlink privileges.
            os.link(root/row["relative"], target)
    report = {"schema": 2, "policy": "holdout-priority-exact-dedup-v2" if overlap_policy == "keep_holdout" else "same-split-exact-dedup-v2", "source_root": str(root),
              "source_count": len(kept)+len(duplicates), "kept_count": len(kept),
              "excluded_count": len(duplicates), "excluded": duplicates,
              "training_overlap_exclusions": sum(r["reason"] == "train_holdout_overlap" for r in duplicates),
              "kept_counts": {split: sum(r["split"] == split for r in kept) for split in ("train", "test")},
              "limitations": "Exact byte duplicates only; reencoded or related footage still needs source-group review."}
    (destination/"curation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Curation complete: {len(kept)} unique videos; {len(duplicates)} redundant copies excluded. Originals preserved.", flush=True)
    print(f"Training copies excluded to protect holdout: {report['training_overlap_exclusions']}. Report results as a curated subset, not the unchanged benchmark.", flush=True)
    print(f"Curation report: {destination/'curation.json'}", flush=True)
    return destination
