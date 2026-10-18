"""
Trains the acne-lesion bounding-box detector (PRD FR-06, Phase 8/9)
by fine-tuning a YOLOv8 model with Ultralytics on Dataset C.

This expects a standard YOLO-format dataset: a `data.yaml` pointing at
`images/`+`labels/` folders for train and val, where each label .txt
uses `class_id x_center y_center width height` (normalized 0-1).
Most YOLO-annotated Kaggle datasets already ship with a data.yaml. If
yours doesn't, see ml/data/make_data_yaml.py.

IMPORTANT: `data.yaml`'s `names:` list order must match the class
indices actually used in the dataset's label files (YOLO label files
only store integer indices, not names) — get this wrong and every
detection will be mislabeled even though the boxes are in the right
place. Cross-check a few label files by hand before training.

Usage:
    python train_detector.py \\
        --data-yaml /path/to/dataset/data.yaml \\
        --output-dir checkpoints/detector \\
        --epochs 100 --imgsz 640

Output: Ultralytics writes its own run directory (weights, curves,
sample predictions) under --output-dir; the best checkpoint ends up at
<output-dir>/<run-name>/weights/best.pt.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-yaml", required=True, type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("checkpoints/detector"))
    parser.add_argument("--run-name", default="skinvision_detector")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument(
        "--base-model",
        default="yolov8n.pt",
        help="Pretrained checkpoint to fine-tune from. 'n' (nano) trains fastest; "
        "try 's' or 'm' if you have more GPU memory and want higher accuracy.",
    )
    args = parser.parse_args()

    if not args.data_yaml.is_file():
        raise SystemExit(f"data.yaml not found: {args.data_yaml}")

    model = YOLO(args.base_model)  # downloads the pretrained checkpoint on first use
    results = model.train(
        data=str(args.data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(args.output_dir),
        name=args.run_name,
        patience=20,  # early stop if val metrics stall
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    print(f"\nDone. Best weights: {best_weights}")
    print(
        "\nNext: copy this file to backend/app/ml_models/detector/best.pt, "
        "then set SKINVISION_MODELS_ARE_TRAINED=true. See QUICKSTART.md.\n"
        "Double-check that the class order in your data.yaml's `names:` matches "
        "ml/labels.py's LESION_CLASSES — if it doesn't, edit LESION_CLASSES to match "
        "your dataset's order (the dataset's annotation order wins, not ours)."
    )


if __name__ == "__main__":
    main()
