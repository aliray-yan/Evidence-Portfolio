"""
Turns a folder-per-class dataset (the most common Kaggle layout) into
the multi-label manifest.csv that train_classifier.py expects.

    dataset/
      Acne/*.jpg
      Blackheads/*.jpg
      Clear/*.jpg
      ...

Usage (auto-guess the mapping from folder names):
    python prepare_classification_manifest.py --data-dir /path/to/dataset --output manifest.csv

Usage (explicit mapping, recommended once you've checked the guess):
    python prepare_classification_manifest.py \\
        --data-dir /path/to/dataset \\
        --mapping mapping.json \\
        --output manifest.csv

mapping.json looks like:
    {
      "Acne": ["acne"],
      "Comedonal_Acne": ["acne", "blackheads"],
      "Clear_Skin": [],
      "Wrinkles": ["wrinkles"]
    }
A folder mapped to `[]` is treated as a negative example for every
label (useful for a "clear skin" / "normal" class). Run once without
`--mapping` first — it prints its best guess as JSON so you can copy,
correct, and reuse it.

If you have several source datasets (PRD Dataset A + Dataset B), run
this once per dataset with `--output` pointing at different files,
then concatenate the resulting CSVs (they share the same columns).
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from labels import CONCERN_LABELS  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _normalize(name: str) -> str:
    return re.sub(r"[\s\-]+", "_", name.strip().lower())


def guess_mapping(folder_names: list[str]) -> dict[str, list[str]]:
    normalized_labels = {label: label for label in CONCERN_LABELS}
    mapping: dict[str, list[str]] = {}
    for folder in folder_names:
        norm = _normalize(folder)
        if norm in normalized_labels:
            mapping[folder] = [normalized_labels[norm]]
        elif norm in ("clear", "normal", "healthy", "none", "no_acne"):
            mapping[folder] = []
        else:
            mapping[folder] = []  # unmatched — user should fix this in mapping.json
    return mapping


def build_rows(data_dir: Path, mapping: dict[str, list[str]]) -> list[dict]:
    rows = []
    for folder in sorted(p for p in data_dir.iterdir() if p.is_dir()):
        labels = mapping.get(folder.name)
        if labels is None:
            print(f"  ! Skipping unmapped folder: {folder.name}", file=sys.stderr)
            continue
        images = [p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]
        for img_path in images:
            row = {"filepath": str(img_path.resolve())}
            for label in CONCERN_LABELS:
                row[label] = 1 if label in labels else 0
            rows.append(row)
        print(f"  {folder.name}: {len(images)} images -> labels {labels}")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", required=True, type=Path)
    parser.add_argument("--mapping", type=Path, default=None, help="Path to a mapping.json (see module docstring)")
    parser.add_argument("--output", type=Path, default=Path("manifest.csv"))
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not args.data_dir.is_dir():
        raise SystemExit(f"Not a directory: {args.data_dir}")

    folder_names = [p.name for p in args.data_dir.iterdir() if p.is_dir()]

    if args.mapping:
        mapping = json.loads(args.mapping.read_text())
    else:
        mapping = guess_mapping(folder_names)
        print("No --mapping given. Best-guess mapping (review before trusting it):")
        print(json.dumps(mapping, indent=2))
        unmatched = [f for f, labels in mapping.items() if not labels]
        if unmatched:
            print(
                f"\n{len(unmatched)} folder(s) mapped to no label — if any of these should map "
                "to a real concern, save this JSON to mapping.json, edit it, and re-run with --mapping mapping.json.",
                file=sys.stderr,
            )

    print(f"\nScanning {args.data_dir} ...")
    rows = build_rows(args.data_dir, mapping)
    if not rows:
        raise SystemExit("No images found — check --data-dir and your mapping.")

    random.seed(args.seed)
    random.shuffle(rows)
    val_count = int(len(rows) * args.val_fraction)
    for i, row in enumerate(rows):
        row["split"] = "val" if i < val_count else "train"

    fieldnames = ["filepath", *CONCERN_LABELS, "split"]
    with args.output.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(
        f"\nWrote {len(rows)} rows ({len(rows) - val_count} train / {val_count} val) to {args.output}"
    )
    per_label_counts = {label: sum(r[label] for r in rows) for label in CONCERN_LABELS}
    print("Positive examples per label:", per_label_counts)


if __name__ == "__main__":
    main()
