"""Execute real training/export on generated colored clips; NOT an accuracy evaluation."""
import argparse
from pathlib import Path
import subprocess
import sys
import cv2
import numpy as np


def make_fixture(root):
    root = Path(root)
    for split, count in (("train", 4), ("val", 2)):
        for label, name in enumerate(("NonFight", "Fight")):
            folder = root / split / name
            folder.mkdir(parents=True, exist_ok=True)
            for index in range(count):
                out = cv2.VideoWriter(str(folder/f"synthetic-{index}.avi"), cv2.VideoWriter_fourcc(*"MJPG"), 10, (64, 48))
                if not out.isOpened():
                    raise RuntimeError("Could not create synthetic fixture.")
                rng = np.random.default_rng(label*100+index+(1000 if split == "val" else 0))
                for _ in range(4):
                    out.write(rng.integers(0, 256, (48, 64, 3), dtype=np.uint8))
                out.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default=".local/training-smoke")
    args = parser.parse_args()
    root = Path(args.directory).resolve()
    make_fixture(root/"data")
    subprocess.run([sys.executable, "-m", "training.train_violence", "--dataset", str(root/"data"),
                    "--output", str(root/"output"), "--epochs", "1", "--batch-size", "2", "--workers", "0", "--smoke"], check=True)
