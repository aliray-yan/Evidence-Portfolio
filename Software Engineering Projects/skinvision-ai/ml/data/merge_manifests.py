"""
Combines manifest CSVs from multiple datasets (e.g. PRD Dataset A +
Dataset B) into one, and re-does the train/val split over the merged
whole so the split stays balanced across sources.

Usage:
    python merge_manifests.py manifest_a.csv manifest_b.csv --output manifest.csv

Note (PRD section 8, Dataset B): don't merge Dataset B in at all until
you've verified its actual license permits your use case — the PRD
explicitly flags it as "unknown, must not be used in a commercial
product until its licensing and redistribution terms are verified."
Also check for duplicate images across datasets before merging (the
PRD's "Do Not" list for Dataset B calls this out specifically) —
`dataset_audit.py` run against each dataset separately will surface
exact duplicates via file hash, but can't catch near-duplicates across
two different source datasets; a manual spot-check is worth doing.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import pandas as pd


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("manifests", nargs="+", type=Path, help="Manifest CSVs to merge")
    parser.add_argument("--output", type=Path, default=Path("manifest.csv"))
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    frames = [pd.read_csv(p) for p in args.manifests]
    combined = pd.concat(frames, ignore_index=True)

    before = len(combined)
    combined = combined.drop_duplicates(subset="filepath")
    if len(combined) < before:
        print(f"Dropped {before - len(combined)} rows with duplicate filepaths.")

    random.seed(args.seed)
    indices = list(combined.index)
    random.shuffle(indices)
    val_count = int(len(indices) * args.val_fraction)
    val_indices = set(indices[:val_count])
    combined["split"] = ["val" if i in val_indices else "train" for i in combined.index]

    combined.to_csv(args.output, index=False)
    print(f"Wrote {len(combined)} rows to {args.output} ({len(combined) - val_count} train / {val_count} val)")


if __name__ == "__main__":
    main()
