"""
Generates a YOLO `data.yaml` for a dataset that already follows the
standard folder convention but doesn't ship its own data.yaml:

    dataset/
      images/train/*.jpg
      images/val/*.jpg
      labels/train/*.txt
      labels/val/*.txt

If your dataset is organized differently (e.g. a single images/ +
labels/ folder with no train/val split), split it into that layout
first — there are many small scripts online for this, or do it by
hand for a dataset of ~920 images.

Usage:
    python make_data_yaml.py --dataset-root /path/to/dataset --output data.yaml

By default this uses ml/labels.py's LESION_CLASSES as the class name
order. Only use the default if you annotated the dataset yourself
using that exact order — if you downloaded a pre-annotated dataset,
open a few of its labels/*.txt files and check the class indices
against whatever class list the dataset's own README describes, and
pass --class-names in that exact order instead.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

sys.path.append(str(Path(__file__).resolve().parent.parent))
from labels import LESION_CLASSES  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset-root", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("data.yaml"))
    parser.add_argument(
        "--class-names",
        nargs="+",
        default=None,
        help="Override class order (must match the dataset's original annotation indices)",
    )
    args = parser.parse_args()

    root = args.dataset_root.resolve()
    for sub in ("images/train", "images/val", "labels/train", "labels/val"):
        if not (root / sub).is_dir():
            raise SystemExit(
                f"Expected {root / sub} to exist. This script assumes the "
                "images/train, images/val, labels/train, labels/val layout — "
                "see the module docstring."
            )

    names = args.class_names or LESION_CLASSES
    data = {
        "path": str(root),
        "train": "images/train",
        "val": "images/val",
        "names": {i: name for i, name in enumerate(names)},
    }

    args.output.write_text(yaml.dump(data, sort_keys=False))
    print(f"Wrote {args.output}")
    print(f"Class order used: {names}")
    print(
        "Double-check this order against your dataset's actual annotation "
        "convention before training — a wrong order silently mislabels every detection."
    )


if __name__ == "__main__":
    main()
