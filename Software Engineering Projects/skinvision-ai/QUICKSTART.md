# Quickstart

Everything you need to run the app, run the tests, and (if you ever
want to) retrain or improve the models. Follow it in order — each part
assumes the previous one worked.

> **Current state: trained models are already included.** Real
> classifier and detector checkpoints ship in `backend/app/ml_models/`,
> and `backend/.env` already has `SKINVISION_MODELS_ARE_TRAINED=true`.
> **You do not need to train anything to run the app** — Part 1 gets
> you a fully working app using the real trained models. Part 3
> (training) is only for retraining or improving on what's already
> there — see "Do I need to train the model again?" right below.

## Do I need to train the model again?

**No.** Both models are already trained and wired in:

- **Classifier** (EfficientNet-B0, all 9 concern labels) — trained on
  Kaggle/Tesla T4, loads cleanly, verified against real sample images.
- **Detector** (YOLOv8n, 6 lesion classes) — also trained on
  Kaggle/Tesla T4, 67 epochs with early stopping. **This one is
  genuinely weak (validation mAP50 = 0.148)** — it runs and returns
  real detections, but treat its bounding boxes as illustrative, not
  accurate. Retraining it (more epochs, more data, or a bigger base
  model) is a good next step whenever you want to — see Part 3 — but
  nothing is broken or missing if you skip that for now.

Just follow Part 1 below to run the app as-is.

Time estimate: ~10 minutes for Part 1 (running the app), ~15 minutes
for Part 2 (tests). Part 3 (retraining, optional) takes anywhere from
a few hours to a day or more depending on your GPU and dataset size.

---

## Prerequisites

- **Python 3.11 or 3.12**
- **Node.js 18.18+ or 20+** (for the frontend)
- **npm** (ships with Node)
- A terminal, and these two project folders: `backend/` and `frontend/`
- (Only for Part 3) A GPU — your own, or free ones via Google Colab or
  Kaggle Notebooks — and a Kaggle account to download datasets

Check what you have:
```bash
python3 --version
node --version
npm --version
```

---

## Part 1 — Run the app

### 1.1 Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-ml.txt  # needed to actually load the trained models
```

A `.env` file is **already included** in this checkout with the
correct settings for the trained models — you don't need to create or
edit it. (`.env.example` documents what's in it, in case you want to
see the defaults or reset something.)

Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

You should see Uvicorn log `Application startup complete.` Leave this
running and open a **new terminal tab** for the next step.

**Verify it's alive:**
```bash
curl http://localhost:8000/health
```
Expected:
```json
{"status":"ok","version":"0.1.0-mvp","models_are_trained":true}
```
`models_are_trained: true` confirms the config is set correctly. This
does **not** by itself confirm the checkpoints loaded successfully —
if `requirements-ml.txt` isn't installed, or a checkpoint file is
missing, the backend silently and safely falls back to the heuristic
placeholder instead of crashing (see `docs/model_card.md`). To confirm
the *real* models are actually being used, check the backend's log
output — `model_loader.py` logs exactly what it loaded (or why it
didn't) at startup / on first request — or check the `model_status`
field in a real `/analyze` response (see 1.3 below).

### 1.2 Frontend

In a new terminal tab:
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open **http://localhost:3000**. You should see the landing page with
the animated face-scan illustration.

### 1.3 Try it end to end

1. Click **"Analyze your skin"**.
2. Upload any clear, front-facing photo of a face (a real photo — the
   quality checks look for an actual detectable face; random/AI-generated
   noise images will correctly get rejected as "no face detected").
3. Click **"Analyze this photo"**.
4. You should land on the results page with concern cards, an
   original/AI-findings image toggle, and general recommendations. The
   small note under "Your results" tells you which model actually
   produced what you're looking at — it should say the real trained
   models are in use, plus a caveat about the detector's low
   validation score. If it instead mentions heuristics, the trained
   checkpoints didn't load — see Troubleshooting.

If step 3 hangs or errors, check the backend terminal for logs, and
see **Troubleshooting** below.

---

## Part 2 — Run the tests

### Backend
```bash
cd backend
source .venv/bin/activate   # if not already active
pytest -v
```
Expected: all tests pass (20 at the time of writing). This includes
tests that load the real shipped checkpoints (skipped automatically if
you ever remove them) and tests that verify the app degrades
gracefully to heuristic mode when a checkpoint isn't available.

### Frontend
```bash
cd frontend
npm run build
```
This both type-checks and builds the app — a clean run with no
`Build error` means everything compiles.

---

## Part 3 — Retrain or improve a model (optional)

**Skip this section unless you want to retrain.** Trained checkpoints
already ship with this repo (see the top of this doc) — the classifier
is solid, but the detector's mAP50 of 0.148 leaves real room for
improvement. This section is for producing a *new* checkpoint,
whether that's improving the existing detector or starting over with
different data.

### 3.1 Set up the ML environment

You can do this on your own GPU machine, or in a Colab/Kaggle
notebook (recommended if you don't have a local GPU — both give you
free GPU time). Either way:

```bash
cd ml
pip install -r requirements.txt
```
On Colab/Kaggle, `torch` is usually preinstalled — you can skip that
line from `requirements.txt` if `pip install torch` would reinstall an
incompatible version; just install the rest (`ultralytics`,
`scikit-learn`, `pandas`, `tqdm`, `pyyaml`).

### 3.2 Download datasets

You said you'll handle this part yourself — `ml/README.md` has the
full table of datasets named in the PRD (direct Kaggle links, what
each one is for, and license caveats — Dataset B in particular is
flagged as unverified for commercial use, and Dataset F is for
fairness evaluation, not training). The short version, for the
classifier:

- **Dataset A** (required): [facial-skin-acne-pigmentation-pores-wrinkles](https://www.kaggle.com/datasets/shijo96john/facial-skin-acne-pigmentation-pores-wrinkles)

and for the detector:

- **Dataset C** (required): [deeplearning-ensemble-for-automated-acne-detection](https://www.kaggle.com/datasets/asmrgaming/deeplearning-ensemble-for-automated-acne-detection)

Using the Kaggle CLI (needs a `kaggle.json` API token from your Kaggle
account settings):
```bash
pip install kaggle --break-system-packages
kaggle datasets download shijo96john/facial-skin-acne-pigmentation-pores-wrinkles -p ./data/dataset_a --unzip
kaggle datasets download asmrgaming/deeplearning-ensemble-for-automated-acne-detection -p ./data/dataset_c --unzip
```
(Or just download the zips from the Kaggle web UI and extract them
yourself — either works.)

### 3.3 Audit the datasets

```bash
python dataset_audit.py --path ./data/dataset_a --output audit_a.md
python dataset_audit.py --path ./data/dataset_c --output audit_c.md
```
Read both reports. Pay attention to:
- **License file found: False** — go check the license on Kaggle
  itself before proceeding.
- **Class imbalance ratio** — if it's high, you may want to weight
  classes (the classifier training script already does this
  automatically via `compute_pos_weight`, so this is more of an
  awareness check than something you need to fix by hand).
- **Corrupt files** — these get skipped automatically during manifest
  prep / training, but worth knowing the count.

### 3.4 Prepare the classifier training manifest

```bash
python data/prepare_classification_manifest.py \
    --data-dir ./data/dataset_a \
    --mapping data/mappings/dataset_a_mapping.json \
    --output manifest.csv
```

**Before trusting this**, open the printed per-folder counts and
compare them against `data/mappings/dataset_a_mapping.json` — the keys
in that file are the folder names *as described* in Dataset A's Kaggle
page, not necessarily the exact names in the actual zip you downloaded
(underscores vs. spaces, different casing, etc. are common). If any
folder printed a warning like `! Skipping unmapped folder: ...`, edit
the mapping file to add it, then re-run.

### 3.5 Train the classifier

```bash
python train_classifier.py \
    --manifest manifest.csv \
    --output-dir checkpoints/classifier \
    --epochs 15 \
    --batch-size 32
```

Watch the printed `val_macro_f1` — it should generally trend up over
epochs. When it finishes, you'll have:
```
checkpoints/classifier/best.pt
checkpoints/classifier/labels.json
checkpoints/classifier/training_log.csv
```

If training is extremely slow, check the very first line the script
prints (`Using device: ...`) — if it says `cpu`, you're not actually
using a GPU (on Colab: Runtime → Change runtime type → GPU).

### 3.6 Prepare and train the detector

Dataset C is YOLO-annotated. If it doesn't already include a
`data.yaml`:
```bash
python data/make_data_yaml.py --dataset-root ./data/dataset_c --output data_c.yaml
```
**Before training**, open 2-3 files in `dataset_c/labels/` by hand and
confirm the class indices they use match the order in `data_c.yaml`'s
`names:` list. `ml/labels.py`'s `LESION_CLASSES` default
(`comedone`/`papule`/`pustule`/`nodule`/`cyst`/`scar`) is just the
PRD's originally-planned taxonomy — **it is not what the
currently-shipped detector actually uses** (that one was trained on a
different dataset labeled `blackheads`/`dark spot`/`nodules`/`papules`/
`pustules`/`whiteheads` — see `docs/model_card.md`). Whatever dataset
you're training on, use *its* actual class names and order, e.g.:
```bash
python data/make_data_yaml.py --dataset-root ./data/dataset_c --output data_c.yaml \
    --class-names comedone papule pustule nodule cyst scar
```

Then train:
```bash
python train_detector.py \
    --data-yaml data_c.yaml \
    --output-dir checkpoints/detector \
    --epochs 100
```
Ultralytics prints its own progress bars and, at the end, a
`Results saved to ...` path. The best weights land at
`checkpoints/detector/<run-name>/weights/best.pt`. Whatever classes
you trained on, the backend picks them up automatically — no code
changes needed (see Part 4, and `docs/model_card.md` for why).

If you're specifically trying to beat mAP50 0.148 on the current
detector: more epochs, more/cleaner training data, and a larger base
model (`--base-model yolov8s.pt` or `yolov8m.pt` instead of the
default `yolov8n.pt`) are the first things worth trying.

### 3.7 Run the fairness check (recommended before shipping)

Download **Dataset F** (the Fitzpatrick17k-based fairness eval set)
and manually check the trained models' error rates across the skin
tones it covers, not just overall accuracy. There's no automated
script for this yet in this repo.

---

## Part 4 — Wire a (re)trained model into the backend

Already done for the checkpoints currently in `backend/app/ml_models/`
— skip this unless you've just produced a *new* checkpoint in Part 3
and want to replace what's there.

```bash
# from the ml/ directory
cp checkpoints/classifier/best.pt ../backend/app/ml_models/classifier/
cp checkpoints/classifier/labels.json ../backend/app/ml_models/classifier/
cp checkpoints/detector/*/weights/best.pt ../backend/app/ml_models/detector/best.pt
```

Install the inference-only dependencies into the **backend's**
environment (lighter than `ml/requirements.txt` — no
pandas/scikit-learn/tqdm needed just to run inference):
```bash
cd ../backend
source .venv/bin/activate
pip install -r requirements-ml.txt
```

Edit `backend/.env` (already exists with `SKINVISION_MODELS_ARE_TRAINED=true`
set from the current checkpoints — nothing to change here unless
you're setting this up somewhere fresh):
```
SKINVISION_MODELS_ARE_TRAINED=true
```
If you retrained the detector and want to update or clear the
low-mAP50 caveat it currently surfaces, edit
`SKINVISION_DETECTOR_QUALITY_NOTE` in the same file.

Restart the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

Verify:
```bash
curl http://localhost:8000/health
```
```json
{"status":"ok","version":"0.1.0-mvp","models_are_trained":true}
```

Then run a real analysis through the frontend and check the small note
under "Your results" — it should say *"Trained model in use..."*
instead of mentioning heuristics. If it still says heuristics despite
`models_are_trained: true`, check the backend terminal logs — a
missing checkpoint file or a failed load logs a clear warning
explaining exactly why it fell back (see `docs/model_card.md` for how
this fallback logic works and why it's designed to never silently lie
about which model produced a result).

Only trained one of the two models? That's fine — the classifier and
detector fall back independently, so e.g. a trained classifier with a
heuristic detector works, and `model_status` in the API response will
report each one's actual source separately.

If your new detector uses **different class names** than the current
one (`blackheads`/`dark spot`/`nodules`/`papules`/`pustules`/`whiteheads`),
you don't need to change any backend code — but for nicer colors/labels
on the results page (instead of the generic title-cased fallback),
add entries for the new class names to `KNOWN_CLASS_COLORS` /
`KNOWN_CLASS_LABELS` in `frontend/components/results/image-panel.tsx`.

---

## Troubleshooting

**Frontend can't reach the backend / "Couldn't reach the analysis service"**
Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
and that the backend terminal is still running without errors.

**`ModuleNotFoundError` when starting the backend**
Make sure the virtualenv is activated (`source .venv/bin/activate`)
and `pip install -r requirements.txt` completed without errors.

**Every photo gets rejected as "no face detected"**
The face detector needs a real, reasonably well-lit, front-facing
photo — it won't detect a face in cartoon/illustrated images, heavily
obscured faces, or extreme angles. Try a different, clearer photo.

**`npm run build` fails on font loading**
`next/font/google` needs network access to `fonts.googleapis.com` at
build time. If you're building somewhere with restricted network
access, this is the likely cause — it will work fine on a normal
internet connection (your laptop, most CI, most hosting providers).

**Training is using CPU, not GPU**
Check `torch.cuda.is_available()`:
```bash
python3 -c "import torch; print(torch.cuda.is_available())"
```
If `False` on a machine you believe has a GPU, you likely have a
CPU-only build of torch installed — reinstall following the command
for your CUDA version at https://pytorch.org/get-started/locally/.
On Colab, make sure Runtime → Change runtime type is set to GPU.

**`pip install` runs out of disk space**
Torch's default PyPI wheel pulls in several GB of CUDA dependency
packages (`nvidia-cublas-cu12`, `nvidia-cudnn-cu12`, etc.) even if
you're on CPU-only hardware. If you don't actually have an NVIDIA GPU
on the machine you're installing on, you can skip all of that:
```bash
pip install --no-deps torch torchvision
```
This installs torch/torchvision alone (a few hundred MB total) without
the CUDA packages — CPU inference works fine this way (training is
still much faster with an actual GPU, e.g. Colab/Kaggle). If you *do*
have a GPU and need the CUDA packages, just free up disk space instead
(a few GB) and install normally, or train on Colab/Kaggle where this
isn't your problem to manage.

**A trained checkpoint doesn't seem to be picked up**
Confirm the exact filenames: `backend/app/ml_models/classifier/best.pt`
**and** `labels.json` (both required), `backend/app/ml_models/detector/best.pt`.
Then check the backend's startup/request logs — `model_loader.py` logs
exactly why a checkpoint wasn't used (missing file, missing
torch/ultralytics install, or a load error) rather than failing
silently.

---

## Project structure reference

```
backend/
  app/
    routers/          # /health, /analyze
    services/          # quality checks, classifier, detector, recommendations, model_loader
    ml_models/          # trained checkpoints go here (gitignored)
  tests/
frontend/
  app/                  # landing, /analyze, /results pages
  components/
  lib/                  # API client, types, validation, context store
ml/
  labels.py             # canonical label lists (single source of truth)
  model_defs.py          # shared model architecture (training + inference both use this)
  train_classifier.py
  train_detector.py
  dataset_audit.py
  data/
    prepare_classification_manifest.py
    make_data_yaml.py
    merge_manifests.py
    mappings/            # ready-made label mappings for PRD datasets A/B/D
docs/
  model_card.md          # what's real vs. heuristic, and exactly how the swap-in works
  privacy.md
  dataset_audit_template.md
```
