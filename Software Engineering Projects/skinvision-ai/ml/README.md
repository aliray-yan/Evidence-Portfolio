# ML — training the real models

This directory has real, runnable training code — it's just never been
run against real data, because this build environment has no network
access to `kaggle.com` and no GPU. Once you download the datasets
yourself, this is the whole path (also see the repo root
`QUICKSTART.md` for the copy-pasteable command sequence).

## 1. Get the datasets (PRD section 8)

| | Dataset | Role | License (as described) |
|---|---|---|---|
| A | [facial-skin-acne-pigmentation-pores-wrinkles](https://www.kaggle.com/datasets/shijo96john/facial-skin-acne-pigmentation-pores-wrinkles) | Primary classification dataset | Check on Kaggle |
| B | [skin-issues-version-2-dataset-balanced](https://www.kaggle.com/datasets/ahmedismaiil/skin-issues-version-2-dataset-balanced) | Supplementary classification | **Unknown — do not use commercially until verified** |
| C | [deeplearning-ensemble-for-automated-acne-detection](https://www.kaggle.com/datasets/asmrgaming/deeplearning-ensemble-for-automated-acne-detection) | Lesion detection (~920 images, YOLO-annotated, 6 classes) | Check on Kaggle |
| D | [acne-dataset-image](https://www.kaggle.com/datasets/tiswan14/acne-dataset-image) | Optional: lesion-subtype classification (~4,620 images) | Apache 2.0 (as described) |
| E | [acne-wrinkles-spots-classification](https://www.kaggle.com/datasets/ranvijaybalbir/acne-wrinkles-spots-classification) | Small supplementary / sanity-check only (~600 images) | CC0 (as described) |
| F | [bttai-ajl-2025](https://www.kaggle.com/competitions/bttai-ajl-2025/data) | **Fairness/robustness eval only** — Fitzpatrick17k subset, ~4,500 images with skin-tone metadata | CC BY-NC-SA 3.0 IGO |
| G | [Nexdata facial skin defects](https://gts.ai/dataset-download/facial-skin-diseases-dataset/) | Optional future expansion (~26,090 images) — verify access/license before relying on it at all | Unverified |

Read each license yourself before training — Dataset B in particular
is explicitly flagged in the PRD as not cleared for commercial use
until you verify it, and Dataset F is licensed for evaluation, not as
training data to ship a product on.

## 2. Audit before training
```bash
python dataset_audit.py --path /path/to/downloaded/dataset --output audit_report.md
```
Checks class balance, duplicate files, corrupt images, resolution
spread, and license-file presence. Fix what it flags (e.g. class
imbalance) before spending GPU time.

## 3. Train the classifier
```bash
pip install -r requirements.txt

# Dataset A is folder-per-class. A starter mapping (from the PRD's own
# documented folder structure) is in data/mappings/dataset_a_mapping.json
# — verify it against your actual downloaded folder names first, they
# may differ slightly from the Kaggle page's description.
python data/prepare_classification_manifest.py \
    --data-dir /path/to/dataset_a \
    --mapping data/mappings/dataset_a_mapping.json \
    --output manifest_a.csv

# Optional: fold in Dataset B and/or D the same way (their mapping
# stubs are in data/mappings/ too — check licenses first, especially B)
python data/prepare_classification_manifest.py --data-dir /path/to/dataset_d --mapping data/mappings/dataset_d_mapping.json --output manifest_d.csv
python data/merge_manifests.py manifest_a.csv manifest_d.csv --output manifest.csv

python train_classifier.py --manifest manifest.csv --output-dir checkpoints/classifier --epochs 15
```
This fine-tunes an ImageNet-pretrained EfficientNet-B0 for multi-label
output over the labels in `labels.py`. Outputs `best.pt`,
`labels.json`, and `training_log.csv` (per-epoch loss + per-label F1).

## 4. Train the detector
```bash
# Dataset C doesn't ship a ready data.yaml in every mirror — if yours
# doesn't, generate one (after inspecting the real class order — see
# the warning below):
python data/make_data_yaml.py --dataset-root /path/to/dataset_c --output data.yaml

python train_detector.py --data-yaml data.yaml --output-dir checkpoints/detector --epochs 100
```
Fine-tunes a YOLOv8 model via Ultralytics on Dataset C's ~2,847
annotated lesions across 6 classes (comedones, papules, pustules,
nodules, cysts, scars — matching `labels.py`'s `LESION_CLASSES`).
**Double-check the class order** in your `data.yaml`'s `names:`
against what the dataset was actually annotated with — YOLO label
files only store integer class indices, not names, so a mismatched
order silently mislabels every detection without erroring.

## 5. Run the fairness/bias audit (PRD section 11)
Use **Dataset F** (the Fitzpatrick17k subset with skin-tone metadata)
to check the trained classifier/detector's error rates across skin
tones and lighting conditions, not just aggregate accuracy. There's no
automated tooling for this here yet — building it is a reasonable next
project once you have a trained model to evaluate.

## 6. Wire it into the backend — no code changes needed
```bash
cp checkpoints/classifier/best.pt checkpoints/classifier/labels.json ../backend/app/ml_models/classifier/
cp checkpoints/detector/*/weights/best.pt ../backend/app/ml_models/detector/best.pt
```
Then in `backend/.env`: `SKINVISION_MODELS_ARE_TRAINED=true`, and
install `backend/requirements-ml.txt` into the backend's environment.
`backend/app/services/model_loader.py` picks the checkpoints up
automatically — see `docs/model_card.md` for exactly how the dispatch
works and what happens if loading fails (it degrades to the heuristic
path and says so, rather than crashing or lying about it).
