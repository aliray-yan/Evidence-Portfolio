"""
Dataset audit tool — PRD section 21, Phase 1 ("Dataset Preparation &
Audit").

This is a real, runnable script (not a placeholder) — point it at a
downloaded dataset directory and it reports class balance, duplicate
files, corrupt images, resolution spread, and whether a license file
is present. It does not download anything itself: this sandboxed
build environment has no network route to kaggle.com, so dataset
download has to happen on a machine that does (your laptop, Colab,
or a Kaggle notebook) — see ml/README.md.

Usage:
    python dataset_audit.py --path /path/to/dataset --output report.md

Expected layout (typical for the Kaggle datasets in PRD section 8):
    dataset/
      class_a/*.jpg
      class_b/*.jpg
      ...
A flat directory (no class subfolders) also works — it's reported as
a single "unlabeled" bucket.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, UnidentifiedImageError

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
LICENSE_FILENAMES = {"license", "license.txt", "license.md", "licence"}


def find_images(root: Path) -> list[Path]:
    return [p for p in root.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]


def class_of(path: Path, root: Path) -> str:
    rel = path.relative_to(root)
    return rel.parts[0] if len(rel.parts) > 1 else "unlabeled"


def file_hash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def audit(root: Path) -> dict:
    images = find_images(root)
    class_counts: Counter[str] = Counter()
    hashes: dict[str, list[str]] = defaultdict(list)
    resolutions: list[tuple[int, int]] = []
    corrupt: list[str] = []

    for path in images:
        cls = class_of(path, root)
        class_counts[cls] += 1
        try:
            digest = file_hash(path)
            hashes[digest].append(str(path.relative_to(root)))
            with Image.open(path) as img:
                img.verify()
            with Image.open(path) as img:
                resolutions.append(img.size)
        except (UnidentifiedImageError, OSError):
            corrupt.append(str(path.relative_to(root)))

    duplicates = {h: files for h, files in hashes.items() if len(files) > 1}

    widths = [w for w, _ in resolutions]
    heights = [h for _, h in resolutions]

    license_present = any(
        f.name.lower() in LICENSE_FILENAMES for f in root.iterdir() if f.is_file()
    )

    total = len(images)
    largest_class = class_counts.most_common(1)[0] if class_counts else None
    smallest_class = min(class_counts.items(), key=lambda kv: kv[1]) if class_counts else None
    imbalance_ratio = (
        round(largest_class[1] / smallest_class[1], 2)
        if largest_class and smallest_class and smallest_class[1] > 0
        else None
    )

    return {
        "total_images": total,
        "class_counts": dict(class_counts),
        "class_imbalance_ratio": imbalance_ratio,
        "duplicate_groups": len(duplicates),
        "duplicate_files": duplicates,
        "corrupt_files": corrupt,
        "resolution": {
            "min_width": min(widths) if widths else None,
            "max_width": max(widths) if widths else None,
            "min_height": min(heights) if heights else None,
            "max_height": max(heights) if heights else None,
        },
        "license_file_found": license_present,
    }


def to_markdown(report: dict, root: Path) -> str:
    lines = [f"# Dataset audit — `{root}`", ""]
    lines.append(f"- Total images: **{report['total_images']}**")
    lines.append(f"- License file found in dataset root: **{report['license_file_found']}**")
    if not report["license_file_found"]:
        lines.append(
            "  - ⚠️ No LICENSE file found. Do not train on or ship this dataset until you've "
            "confirmed usage rights from the original source (PRD section 8/11)."
        )
    lines.append("")
    lines.append("## Class balance")
    for cls, count in sorted(report["class_counts"].items(), key=lambda kv: -kv[1]):
        lines.append(f"- `{cls}`: {count}")
    if report["class_imbalance_ratio"]:
        lines.append(f"- Largest/smallest class ratio: **{report['class_imbalance_ratio']}x**")
        if report["class_imbalance_ratio"] > 3:
            lines.append(
                "  - ⚠️ Significant imbalance. Consider class weighting or resampling before "
                "training (PRD Phase 1 checklist)."
            )
    lines.append("")
    lines.append("## Data quality")
    lines.append(f"- Duplicate file groups: {report['duplicate_groups']}")
    lines.append(f"- Corrupt/unreadable files: {len(report['corrupt_files'])}")
    res = report["resolution"]
    if res["min_width"] is not None:
        lines.append(
            f"- Resolution range: {res['min_width']}x{res['min_height']} to "
            f"{res['max_width']}x{res['max_height']}"
        )
    if report["corrupt_files"]:
        lines.append("")
        lines.append("### Corrupt files")
        for f in report["corrupt_files"][:50]:
            lines.append(f"- {f}")
        if len(report["corrupt_files"]) > 50:
            lines.append(f"- ...and {len(report['corrupt_files']) - 50} more")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", required=True, type=Path, help="Path to the dataset directory")
    parser.add_argument("--output", type=Path, default=None, help="Optional path to write a Markdown report")
    parser.add_argument("--json", action="store_true", help="Print raw JSON instead of Markdown")
    args = parser.parse_args()

    if not args.path.is_dir():
        raise SystemExit(f"Not a directory: {args.path}")

    report = audit(args.path)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        markdown = to_markdown(report, args.path)
        print(markdown)
        if args.output:
            args.output.write_text(markdown)
            print(f"\nWrote report to {args.output}")


if __name__ == "__main__":
    main()
