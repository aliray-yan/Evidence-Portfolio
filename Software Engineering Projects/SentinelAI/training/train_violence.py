"""Kaggle GPU baseline: R3D-18 transfer learning; no claims of police-domain accuracy."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import random
import shutil
import time
import numpy as np
import torch
import torchvision
from torch.utils.data import DataLoader, Dataset
from torchvision.models.video import R3D_18_Weights, r3d_18
from sentinel_ml.video import PREPROCESS, read_clip, sha256
from training.data import inventory, metrics, choose_threshold


class Clips(Dataset):
    def __init__(self, rows, augment=False):
        self.rows, self.augment = rows, augment

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        # Both training and inference cover a maximum five-second window uniformly.
        value = read_clip(row["path"], 0, min(5, row["duration"]))
        if self.augment and random.random() < .5:
            value = value[:, :, :, ::-1].copy()
        return torch.from_numpy(value), row["label"]


def predict(model, loader, device):
    model.eval()
    labels, scores = [], []
    with torch.inference_mode():
        for x, y in loader:
            out = model(x.to(device)).softmax(1)[:, 1]
            if not torch.isfinite(out).all():
                raise ValueError("Nonfinite model output; no export written.")
            labels.extend(y.tolist())
            scores.extend(out.cpu().tolist())
    return labels, scores


def train(args):
    if not torch.cuda.is_available() and not args.smoke:
        raise RuntimeError("Enable a Kaggle GPU accelerator before training. CPU is allowed only for --smoke plumbing tests.")
    if not args.authorized_dataset and not args.smoke:
        raise ValueError("Confirm authorized dataset use with --authorized-dataset after reviewing the dataset terms.")
    if args.epochs < 1 or args.batch_size < 1 or args.workers < 0:
        raise ValueError("Epochs/batch size must be positive; workers cannot be negative.")
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.cuda.manual_seed_all(args.seed)
    torch.set_num_threads(2)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        raise ValueError("Output folder must be empty; preserve earlier experiment results.")
    rows = inventory(args.dataset, args.seed, args.groups)
    print(json.dumps({"inventory_complete": True, "counts": {s: sum(r['split'] == s for r in rows) for s in ('train', 'dev', 'test')}, "grouped_by_source": bool(args.groups)}), flush=True)
    public_rows = [{k:v for k,v in r.items() if k != "path"} for r in rows]
    (output/"split.json").write_text(json.dumps(public_rows, indent=2), encoding="utf-8")
    curation_file = Path(args.dataset)/"curation.json"
    if curation_file.is_file():
        shutil.copyfile(curation_file, output/"curation.json")
    loaders = {split: DataLoader(Clips([r for r in rows if r["split"] == split], split == "train"),
                                batch_size=args.batch_size, shuffle=split == "train", num_workers=args.workers,
                                pin_memory=device.type == "cuda") for split in ("train", "dev", "test")}
    # Failure to fetch pretrained weights is an error, never silent random initialization.
    model = r3d_18(weights=None if args.smoke else R3D_18_Weights.KINETICS400_V1)
    model.fc = torch.nn.Linear(model.fc.in_features, 2)
    model.to(device)
    for name, parameter in model.named_parameters():
        parameter.requires_grad = name.startswith(("layer4.", "fc."))
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=args.lr, weight_decay=.01)
    criterion = torch.nn.CrossEntropyLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    best, history, start = -1.0, [], time.perf_counter()
    for epoch in range(args.epochs):
        # Frozen backbone and batchnorm statistics stay in eval mode for small batches.
        model.eval()
        loss_sum, examples = 0.0, 0
        for x, y in loaders["train"]:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type, enabled=device.type == "cuda"):
                loss = criterion(model(x), y)
            if not torch.isfinite(loss):
                raise ValueError("Nonfinite training loss; inspect the data and lower the learning rate.")
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
            loss_sum += loss.item()*len(y)
            examples += len(y)
            if args.smoke:
                break
        labels, scores = predict(model, loaders["dev"], device)
        dev_result = metrics(labels, scores, .5)
        record = {"epoch": epoch+1, "train_loss": loss_sum/examples, "dev": dev_result}
        history.append(record)
        print(json.dumps(record), flush=True)
        if dev_result["f1"] > best:
            best = dev_result["f1"]
            torch.save({k:v.detach().cpu() for k,v in model.state_dict().items()}, output/"weights.pt")
        (output/"history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    model.load_state_dict(torch.load(output/"weights.pt", map_location=device, weights_only=True))
    dev_labels, dev_scores = predict(model, loaders["dev"], device)
    chosen = choose_threshold(dev_labels, dev_scores)
    # Held-out set is touched for prediction only after model/threshold selection is done.
    labels, scores = predict(model, loaders["test"], device)
    evaluation = metrics(labels, scores, chosen["threshold"])
    test_rows = [r for r in rows if r["split"] == "test"]
    (output/"test_predictions.json").write_text(json.dumps([
        {"relative": r["relative"], "label": y, "score": s} for r,y,s in zip(test_rows, labels, scores)
    ], indent=2), encoding="utf-8")
    manifest = {"schema": 1, "architecture": "torchvision-r3d_18", "version": args.version,
                "purpose": "test_only" if args.smoke else "research_trained", "labels": ["nonfight", "fight"],
                "weights": "weights.pt", "sha256": sha256(output/"weights.pt"), "preprocess": PREPROCESS,
                "threshold": chosen["threshold"], "evaluation": evaluation,
                "training": {"dataset": "Synthetic plumbing test" if args.smoke else args.dataset_name,
                             "seed": args.seed, "epochs": args.epochs, "pretrained": not args.smoke,
                             "split_sha256": sha256(output/"split.json"), "grouped": bool(args.groups),
                             "curation_sha256": sha256(output/"curation.json") if (output/"curation.json").is_file() else None,
                             "counts": {s:len(loaders[s].dataset) for s in loaders}, "development": chosen,
                             "seconds": round(time.perf_counter()-start, 3), "device": str(device),
                             "hardware": torch.cuda.get_device_name(0) if device.type == "cuda" else "CPU",
                             "torch": torch.__version__, "torchvision": torchvision.__version__,
                             "created_at": datetime.now(timezone.utc).isoformat()},
                "limitations": ["Uncalibrated clip score, not misconduct probability.",
                                "Not validated on Pakistani mobile/police interactions.",
                                "Exact duplicate screening does not detect near-duplicate/source leakage.",
                                "No weapon, identity, gesture, audio or bribery classification."]}
    (output/"manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    shutil.make_archive(str(output), "zip", output)
    print(f"Exported {output}.zip ({manifest['purpose']}). Held-out metrics: {json.dumps(evaluation)}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--dataset-name", default="RWF-2000 (operator supplied)", help="Dataset name/source recorded in the exported manifest")
    parser.add_argument("--output", required=True)
    parser.add_argument("--groups", help="JSON mapping dataset-relative path to source/session group")
    parser.add_argument("--version", default="rwf-r3d18-v1")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--authorized-dataset", action="store_true")
    parser.add_argument("--smoke", action="store_true", help="Random initialization, one training batch/epoch; exported bundle is rejected by server")
    train(parser.parse_args())


if __name__ == "__main__":
    main()
