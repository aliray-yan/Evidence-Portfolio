"""Regenerate the standalone uploadable notebook from the reviewed Python sources."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def build():
    cells = []
    def add(kind, source):
        cell = {"cell_type": kind, "metadata": {}, "source": source.splitlines(keepends=True)}
        if kind == "code":
            cell.update(execution_count=None, outputs=[])
        cells.append(cell)
    add("markdown", """# SentinelAI — RWF-2000 research baseline
Train one visual fight/nonfight component. This does **not** train Urdu speech, bribery context, gestures, weapons or a validated misconduct classifier.

1. Create a **private** Kaggle notebook, import this file, enable a GPU, and attach either your original RWF-2000 source or the [new collection](https://www.kaggle.com/datasets/magicearth25/video-violence-detection-dataset). The new collection includes RLVS and RWF-2000; select its **RWF-2000 subset** for this baseline. Do not combine duplicate copies.
2. Check the dataset's access/use terms. The [original authors](https://github.com/mchengny/RWF2000-Video-Database-for-Violence-Detection) currently withhold downloads for privacy and restrict redistribution/commercial use. A mirror's availability does not settle permission. No dataset is downloaded or republished by this notebook.
3. Enable Internet for the initial torchvision Kinetics-400 pretrained weight download, or use Kaggle's already cached weights. Missing weights stop training.
4. Set `AUTHORIZED_DATASET = True` only after confirming authorized use. Kaggle reports the new collection's license as **Unknown**; do not infer permission from its presence on Kaggle. Adjust the dataset path if automatic discovery finds multiple RWF copies.
5. Run all cells. Download `sentinel-rwf-r3d18-v1.zip` from Output. Keep the notebook private and do not publish source footage.

The supplied `val/` (or `test/`) is held out. A development subset comes only from `train/`. Preparation keeps one copy of identical videos with the same label within each original split, without modifying the source dataset. Every exclusion is recorded in `curation.json`. Exact cross-split duplicates keep their held-out copy; all matching training copies are excluded before development splitting. Conflicting labels or source groups still stop preparation. Results describe this curated subset, not the unchanged published benchmark. Optional source/session groups prevent group leakage; otherwise splitting is clip-level and exact hashes catch only exact duplicates. Do not report these results as local police/mobile accuracy. XD-Violence and a consented Pakistani dataset remain separate future work.
""")
    modules = ["sentinel_ml/__init__.py", "sentinel_ml/video.py", "training/__init__.py", "training/data.py", "training/curation.py", "training/train_violence.py"]
    sources = {name:(ROOT/name).read_text(encoding="utf-8") for name in modules}
    add("code", "from pathlib import Path\nimport sys, json, subprocess, importlib\nSOURCE = Path('/kaggle/working/sentinel_src')\n" +
        "FILES = " + repr(sources) + "\nfor name, source in FILES.items():\n    target = SOURCE / name\n    target.parent.mkdir(parents=True, exist_ok=True)\n    target.write_text(source, encoding='utf-8')\nsys.path.insert(0, str(SOURCE))\nfor module_name in list(sys.modules):\n    if module_name in ('training', 'sentinel_ml') or module_name.startswith(('training.', 'sentinel_ml.')):\n        del sys.modules[module_name]\nimportlib.invalidate_caches()\nimport torch, torchvision, cv2, numpy\nprint('Torch:', torch.__version__, 'Torchvision:', torchvision.__version__)\nassert torch.cuda.is_available(), 'Enable a GPU accelerator in Kaggle settings.'\nprint('GPU:', torch.cuda.get_device_name(0))\n")
    add("code", """DATASET_ROOT = None  # Or the exact RWF-2000 folder containing train/ and val/
DATASET_NAME = 'RWF-2000 via magicearth25/video-violence-detection-dataset'
AUTHORIZED_DATASET = False
GROUPS_FILE = None  # Optional JSON: dataset-relative video path -> original source/session ID
EPOCHS = 8
BATCH_SIZE = 4  # Reduce to 2 or 1 if GPU memory is exhausted
VERSION = 'rwf-r3d18-v1'
OUTPUT = Path('/kaggle/working/sentinel-' + VERSION)
assert AUTHORIZED_DATASET, 'Confirm dataset authorization before running training.'
from training.data import find_root, dataset_roots
candidates = dataset_roots('/kaggle/input')
print('Available subsets:', [str(p) for p in candidates])
if DATASET_ROOT:
    dataset = find_root(DATASET_ROOT)
else:
    rwf = [p for p in candidates if p.name.casefold().replace('-', '').replace('_', '') == 'rwf2000']
    assert len(rwf) == 1, 'Set DATASET_ROOT to one RWF-2000 root. Do not merge collections or duplicate RWF copies.'
    dataset = rwf[0]
print('Dataset root:', dataset)
from training.curation import curate
import tempfile
dataset = curate(dataset, Path(tempfile.mkdtemp(prefix='sentinel-rwf-curated-', dir='/kaggle/working')), GROUPS_FILE, overlap_policy='keep_holdout')
""")
    add("code", """command = [sys.executable, '-m', 'training.train_violence', '--dataset', str(dataset),
           '--output', str(OUTPUT), '--epochs', str(EPOCHS), '--batch-size', str(BATCH_SIZE),
           '--version', VERSION, '--dataset-name', DATASET_NAME, '--authorized-dataset']
if GROUPS_FILE:
    command += ['--groups', GROUPS_FILE]
subprocess.run(command, cwd=SOURCE, check=True)
""")
    add("code", """manifest = json.loads((OUTPUT / 'manifest.json').read_text())
print(json.dumps(manifest, indent=2))
from IPython.display import FileLink, display
display(FileLink(str(OUTPUT) + '.zip'))
""")
    add("markdown", """## Bring the result into SentinelAI
Extract the ZIP into `.local/models/violence-v1`. Install `requirements-vision.txt` in the backend Python environment. Run `python -m backend.model_check .local/models/violence-v1`, set `SENTINEL_VIOLENCE_MODEL` to that folder and restart the backend.

Upload a **new**, authorized short recording. Previously processed originals were deleted for privacy, so they cannot be re-analyzed from the blurred copies. Inspect the processing record, timestamped events, model score, local alert and report. A model score is not a calibrated probability. A clip flag requests human review; it does not identify who acted or justify enforcement.

Keep the split manifest, history and test predictions with the weights for your FYP report. Near-duplicate/source leakage and camera/domain shift still need independent checks. Training may take longer than a Kaggle session; this baseline saves the best weights each epoch but does not implement optimizer-state resume. Preserve interrupted outputs and rerun with a new output/version.
""")
    notebook = {"nbformat": 4, "nbformat_minor": 5, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python", "version": "3.11"}}, "cells": cells}
    for i, cell in enumerate(cells):
        cell["id"] = f"sentinel-{i:03}"
    target = ROOT / "training" / "SentinelAI_RWF2000_Kaggle.ipynb"
    target.write_text(json.dumps(notebook, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    # Standalone cell for a notebook already running the previous embedded sources.
    recovery = ("# Paste this entire file into a NEW Kaggle code cell immediately before the training cell.\n"
                "# Run it once, then rerun the training cell (do not rerun the dataset-selection cell).\n\n" +
                sources["training/curation.py"] + "\n\nimport tempfile\n"
                "dataset = Path(dataset)\n"
                "if not (dataset / 'curation.json').is_file():\n"
                "    dataset = curate(dataset, Path(tempfile.mkdtemp(prefix='sentinel-rwf-curated-', dir='/kaggle/working')), globals().get('GROUPS_FILE'), overlap_policy='keep_holdout')\n"
                "else:\n"
                "    print('Reusing the curated dataset and its original exclusion report.')\n"
                "print('Training will now use:', dataset)\n"
                "# Keep the curation report alongside the old trainer's eventual export.\n"
                "report = json.loads((dataset / 'curation.json').read_text())\n"
                "report['source_dataset_name'] = globals().get('DATASET_NAME', '')\n"
                "report['intended_model_version'] = globals().get('VERSION', '')\n"
                "report_path = Path(str(OUTPUT) + '-curation.json')\n"
                "report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')\n"
                "print('Also download this report with the model ZIP:', report_path)\n")
    (ROOT/"training"/"Kaggle_duplicate_recovery.py").write_text(recovery, encoding="utf-8")
    return target


if __name__ == "__main__":
    print(build())
