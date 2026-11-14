"""RWF-style inventory, deterministic development split and measured binary metrics."""
from pathlib import Path
import json
import random
from sentinel_ml.video import sha256, video_info

EXTENSIONS = {".avi", ".mp4", ".mov", ".mkv", ".webm"}


def dataset_roots(path):
    path = Path(path)
    candidates = [path, *sorted(p.parent for p in path.rglob("train") if p.is_dir())]
    matches = []
    for candidate in candidates:
        children = {p.name.casefold(): p for p in candidate.iterdir() if p.is_dir()}
        if "train" in children and ("val" in children or "test" in children):
            if candidate not in matches:
                matches.append(candidate)
    return matches


def find_root(path):
    matches = dataset_roots(path)
    if len(matches) != 1:
        raise ValueError("Set DATASET_ROOT to exactly one dataset with train/ and val/ (or test/) folders. Collections must select a subset; do not mix RWF copies.")
    return matches[0]


def inventory(root, seed=42, groups_file=None):
    root = find_root(root)
    groups = json.loads(Path(groups_file).read_text()) if groups_file else {}
    children = {p.name.casefold(): p for p in root.iterdir() if p.is_dir()}
    if "test" in children and "val" in children:
        raise ValueError("Both val and test exist. Use an explicit curated RWF two-split root; do not guess the holdout.")
    source_splits = {"train": children["train"], "test": children.get("test", children.get("val"))}
    rows, hashes, assigned_groups = [], {}, {}
    for split, folder in source_splits.items():
        for video in sorted(folder.rglob("*")):
            if video.suffix.casefold() not in EXTENSIONS:
                continue
            category = video.parent.name.casefold().replace("-", "").replace("_", "")
            if category not in ("fight", "nonfight"):
                raise ValueError(f"Unrecognized class folder: {video.parent.name}")
            relative = video.relative_to(root).as_posix()
            digest = sha256(video)
            if digest in hashes:
                raise ValueError(f"Duplicate content: {relative} and {hashes[digest]}. Curate duplicates before training.")
            hashes[digest] = relative
            fps, count = video_info(video)
            if not .2 <= count/fps <= 5.5:
                raise ValueError(f"Expected short RWF clips (0.2–5.5 s): {relative}. Do not silently truncate another dataset.")
            if groups_file and relative not in groups:
                raise ValueError(f"Missing source/session group for {relative}")
            group = groups.get(relative, relative)
            if not isinstance(group, str) or not group:
                raise ValueError("Group IDs must be nonempty strings.")
            if group in assigned_groups and assigned_groups[group] != split:
                raise ValueError("A source/session group crosses the supplied train/holdout boundary.")
            assigned_groups[group] = split
            rows.append({"path": str(video), "relative": relative, "label": int(category == "fight"),
                         "sha256": digest, "group": group, "split": split, "duration": count/fps})
    training_groups = sorted({r["group"] for r in rows if r["split"] == "train"})
    rng = random.Random(seed)
    # Shuffle groups until both classes exist in train and dev, without splitting a group.
    selected = None
    for _ in range(1000):
        rng.shuffle(training_groups)
        dev = set(training_groups[:max(2, round(len(training_groups)*.2))])
        if all({r["label"] for r in rows if r["split"] == "train" and ((r["group"] in dev) == is_dev)} == {0, 1} for is_dev in (True, False)):
            selected = dev
            break
    if selected is None or {r["label"] for r in rows if r["split"] == "test"} != {0, 1}:
        raise ValueError("Each of train, development and held-out test needs both classes and sufficient independent groups.")
    for row in rows:
        if row["split"] == "train" and row["group"] in selected:
            row["split"] = "dev"
    return rows


def metrics(labels, scores, threshold):
    if len(labels) != len(scores) or not labels:
        raise ValueError("Metrics require aligned nonempty labels and scores.")
    tp = sum(y == 1 and p >= threshold for y, p in zip(labels, scores))
    tn = sum(y == 0 and p < threshold for y, p in zip(labels, scores))
    fp = sum(y == 0 and p >= threshold for y, p in zip(labels, scores))
    fn = sum(y == 1 and p < threshold for y, p in zip(labels, scores))
    return {"count": len(labels), "threshold": threshold, "confusion_matrix": [[tn, fp], [fn, tp]],
            "accuracy": (tp+tn)/len(labels), "precision": tp/max(1, tp+fp),
            "recall": tp/max(1, tp+fn), "f1": 2*tp/max(1, 2*tp+fp+fn)}


def choose_threshold(labels, scores):
    # Select once on development only. Conservative tie-break: higher threshold.
    return max((metrics(labels, scores, n/100) for n in range(5, 100)), key=lambda m: (m["f1"], m["threshold"]))
