"""
Trains the multi-label skin-concern classifier (PRD FR-05, Phase 2/7).

Transfer learning off an ImageNet-pretrained EfficientNet-B0: this is
a strong, fast-to-train baseline that fits on a single consumer/Colab
GPU, matching the PRD's "baseline model" framing in Phase 2.

Input: a manifest CSV with columns `filepath`, one 0/1 column per
label in ml/labels.py's CONCERN_LABELS, and a `split` column
(`train`/`val`) — see ml/data/prepare_classification_manifest.py.

Usage:
    python train_classifier.py \\
        --manifest manifest.csv \\
        --output-dir checkpoints/classifier \\
        --epochs 15 --batch-size 32

Output (written to --output-dir):
    best.pt        — model weights (state_dict) for the best val loss
    labels.json     — the exact label order the model was trained on
    training_log.csv — per-epoch train/val loss + per-label F1
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import f1_score, precision_score, recall_score
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from tqdm import tqdm

sys.path.append(str(Path(__file__).resolve().parent))
from labels import CONCERN_LABELS  # noqa: E402
from model_defs import build_classifier_model, build_eval_transforms, build_train_transforms  # noqa: E402


class SkinConcernDataset(Dataset):
    def __init__(self, df: pd.DataFrame, labels: list[str], transform: transforms.Compose):
        self.df = df.reset_index(drop=True)
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        image = Image.open(row["filepath"]).convert("RGB")
        image = self.transform(image)
        target = torch.tensor([float(row[label]) for label in self.labels], dtype=torch.float32)
        return image, target


def compute_pos_weight(df: pd.DataFrame, labels: list[str]) -> torch.Tensor:
    """Per-label positive class weight for BCEWithLogitsLoss, so a rare
    label (e.g. acne_scars with few positives) doesn't get ignored."""
    weights = []
    for label in labels:
        pos = df[label].sum()
        neg = len(df) - pos
        weights.append(neg / pos if pos > 0 else 1.0)
    return torch.tensor(weights, dtype=torch.float32)


def evaluate(model, loader, device, labels, threshold=0.5):
    model.eval()
    all_targets, all_preds = [], []
    total_loss = 0.0
    criterion = nn.BCEWithLogitsLoss()
    with torch.no_grad():
        for images, targets in loader:
            images, targets = images.to(device), targets.to(device)
            logits = model(images)
            total_loss += criterion(logits, targets).item() * images.size(0)
            probs = torch.sigmoid(logits)
            all_preds.append((probs > threshold).float().cpu())
            all_targets.append(targets.cpu())

    all_preds = torch.cat(all_preds).numpy()
    all_targets = torch.cat(all_targets).numpy()
    avg_loss = total_loss / len(loader.dataset)

    per_label_f1 = f1_score(all_targets, all_preds, average=None, zero_division=0)
    macro_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
    precision = precision_score(all_targets, all_preds, average="macro", zero_division=0)
    recall = recall_score(all_targets, all_preds, average="macro", zero_division=0)

    return {
        "loss": avg_loss,
        "macro_f1": macro_f1,
        "macro_precision": precision,
        "macro_recall": recall,
        "per_label_f1": dict(zip(labels, per_label_f1.tolist())),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--threshold", type=float, default=0.5, help="Probability threshold for val F1 reporting")
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--freeze-backbone-epochs", type=int, default=2, help="Train only the new head for this many epochs first")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if device.type == "cpu":
        print(
            "WARNING: no GPU detected. Training on CPU will be very slow — "
            "this script is intended to run on a GPU machine or a Colab/Kaggle GPU runtime."
        )

    df = pd.read_csv(args.manifest)
    missing_cols = [c for c in CONCERN_LABELS if c not in df.columns]
    if missing_cols:
        raise SystemExit(f"Manifest is missing label columns: {missing_cols}")
    if "split" not in df.columns:
        raise SystemExit("Manifest needs a 'split' column with values 'train'/'val'.")

    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]
    print(f"Train: {len(train_df)} images, Val: {len(val_df)} images")

    train_ds = SkinConcernDataset(train_df, CONCERN_LABELS, build_train_transforms())
    val_ds = SkinConcernDataset(val_df, CONCERN_LABELS, build_eval_transforms())
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)

    model = build_classifier_model(len(CONCERN_LABELS)).to(device)
    pos_weight = compute_pos_weight(train_df, CONCERN_LABELS).to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    log_rows = []
    best_val_loss = float("inf")

    for epoch in range(1, args.epochs + 1):
        # Simple two-stage strategy: freeze the pretrained backbone for
        # the first few epochs so the randomly-initialized head doesn't
        # immediately wreck the pretrained features.
        for param in model.features.parameters():
            param.requires_grad = epoch > args.freeze_backbone_epochs

        model.train()
        running_loss = 0.0
        for images, targets in tqdm(train_loader, desc=f"Epoch {epoch}/{args.epochs}"):
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)
        scheduler.step()

        train_loss = running_loss / len(train_loader.dataset)
        val_metrics = evaluate(model, val_loader, device, CONCERN_LABELS, args.threshold)

        print(
            f"Epoch {epoch}: train_loss={train_loss:.4f} val_loss={val_metrics['loss']:.4f} "
            f"val_macro_f1={val_metrics['macro_f1']:.3f}"
        )
        log_rows.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "val_loss": val_metrics["loss"],
                "val_macro_f1": val_metrics["macro_f1"],
                "val_macro_precision": val_metrics["macro_precision"],
                "val_macro_recall": val_metrics["macro_recall"],
                **{f"f1_{k}": v for k, v in val_metrics["per_label_f1"].items()},
            }
        )

        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            torch.save(model.state_dict(), args.output_dir / "best.pt")
            print(f"  -> saved new best checkpoint (val_loss={best_val_loss:.4f})")

    (args.output_dir / "labels.json").write_text(json.dumps(CONCERN_LABELS, indent=2))

    with (args.output_dir / "training_log.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(log_rows[0].keys()))
        writer.writeheader()
        writer.writerows(log_rows)

    print(f"\nDone. Best val loss: {best_val_loss:.4f}")
    print(f"Checkpoint: {args.output_dir / 'best.pt'}")
    print(f"Label order: {args.output_dir / 'labels.json'}")
    print(
        "\nNext: copy best.pt and labels.json into "
        "backend/app/ml_models/classifier/, then set "
        "SKINVISION_MODELS_ARE_TRAINED=true. See QUICKSTART.md."
    )


if __name__ == "__main__":
    main()
