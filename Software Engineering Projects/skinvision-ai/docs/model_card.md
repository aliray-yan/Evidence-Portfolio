# Model Card — SkinVision AI

## Current status (as shipped)

**Real trained checkpoints are included and active by default**
(`backend/.env` sets `SKINVISION_MODELS_ARE_TRAINED=true`, and
`backend/app/ml_models/` ships both checkpoints). Both were trained on
Kaggle using a Tesla T4 GPU:

| | Architecture | Trained on | Status |
|---|---|---|---|
| Classifier | EfficientNet-B0, multi-label | `archive` (4,233 images) — all 9 canonical labels (`acne`, `blackheads`, `whiteheads`, `visible_pores`, `redness`, `dark_spots`, `pigmentation`, `wrinkles`, `acne_scars`) | Loads cleanly, verified on real sample images (e.g. correctly flagged `acne` at p=1.0 on an image labeled "inflammatory acne") |
| Detector | YOLOv8n | A different Kaggle dataset annotated for `blackheads`, `dark spot`, `nodules`, `papules`, `pustules`, `whiteheads` | **Experimental — validation mAP50 = 0.148** after 67 epochs (early stopping). Loads and runs correctly, but treat its bounding boxes as illustrative, not reliable |

If either checkpoint is ever missing, corrupted, or its dependencies
aren't installed, the backend automatically falls back to the
heuristic placeholder described below — see "How the fallback works".

### The bug this model card used to describe as "planned" — and its fix

The detector's classes (`blackheads`, `dark spot`, `nodules`,
`papules`, `pustules`, `whiteheads`) do not match the PRD's originally
planned taxonomy (`comedone`, `papule`, `pustule`, `nodule`, `cyst`,
`scar`) — the actual training dataset used on Kaggle was annotated
differently. `Detection.cls` / `LesionClass` used to be a strict
Pydantic `Literal` of the planned 6 classes, which meant the moment
this real trained model returned an actual detection, the API raised
a `ValidationError` (HTTP 500) — verified directly before fixing it.

The fix: `LesionClass` (`backend/app/schemas.py`) and its frontend
counterpart (`frontend/lib/types.ts`) are now plain strings, not a
fixed enum. This is the architecturally correct shape, not a patch —
detector class names are inherently whatever the *currently loaded
checkpoint* was trained with (`ultralytics` reads them from
`model.names`, embedded at training time), so a fixed union here would
break again on the next retrain with a different label set. The
frontend (`components/results/image-panel.tsx`) has a lookup table for
known class names' colors/labels with a sensible title-cased fallback
for anything it doesn't recognize, so a future differently-labeled
detector won't need a frontend code change either.

`ConcernLabel` (the classifier's output) intentionally stayed a fixed
Literal — the recommendation engine (`recommendations.py`) keys
specific rules off those exact 9 label strings, so that side of the
system needs the trained model's `labels.json` to match, which this
one does exactly.

## How the fallback works (when a trained checkpoint isn't available)

`backend/app/services/classifier.py` and `detector.py` compute real
pixel statistics — color-channel balance for redness, Laplacian
texture for pore/wrinkle proxies, connected-component blob counting
for spots/blackheads/whiteheads — as a heuristic stand-in. Real
signal, but not a trained model.

| Label | Signal used |
|---|---|
| `redness` | mean(R − (G+B)/2) over the face crop |
| `visible_pores` | Laplacian variance (texture) |
| `wrinkles` | Canny edge density |
| `dark_spots` / `pigmentation` | large dark connected-component count (weakly distinguished — same underlying signal) |
| `blackheads` / `whiteheads` | small dark/bright connected-component count |
| `acne` | blend of redness + small dark blobs |
| `acne_scars` | not computed by the heuristic (the trained classifier does cover it) |
| Detector boxes | dark blob rectangles, classed `blackheads`/`papules` by local redness — matches the real detector's vocabulary so heuristic and trained results render consistently |

Every heuristic classifier score is capped below `"high"` confidence.
`model_status.classifier` / `model_status.detector` in every API
response report which path *actually ran for that request* —
`"trained"` or `"heuristic_placeholder"` — computed fresh per request
rather than read once from config, specifically so a checkpoint that
fails to load or fails during inference can never be misreported as
"trained" (see `_build_model_status()` in `routers/analyze.py`). When
the trained detector serves a response, its low-mAP50 caveat is
automatically appended to that same note
(`SKINVISION_DETECTOR_QUALITY_NOTE` in `backend/.env`) — remove that
env var once a better detector replaces this one.

## Retraining / replacing either model

`ml/train_classifier.py` and `ml/train_detector.py` are complete,
runnable training scripts (see `ml/README.md` / root `QUICKSTART.md`).
Swapping in a new checkpoint requires **no code changes**:

1. Train with the scripts above (or however you like — the backend
   only cares about the checkpoint format, not how it was produced).
2. Copy the resulting checkpoint(s) into `backend/app/ml_models/classifier/`
   and/or `backend/app/ml_models/detector/`, replacing what's there.
3. Install `backend/requirements-ml.txt` into the backend's environment.
4. Confirm `SKINVISION_MODELS_ARE_TRAINED=true` in `backend/.env`.
5. If the new detector's classes differ from the current one, update
   `KNOWN_CLASS_COLORS`/`KNOWN_CLASS_LABELS` in
   `frontend/components/results/image-panel.tsx` for nicer display —
   optional, since unknown classes already get a readable fallback.
6. If retraining the detector specifically to improve on mAP50 0.148,
   update or clear `SKINVISION_DETECTOR_QUALITY_NOTE` in `backend/.env`
   once the new checkpoint's validation numbers justify it.

`backend/app/services/model_loader.py` lazily loads whatever
checkpoints it finds at the configured paths; loading/inference
failures log a warning and fall back to the heuristic automatically.
Nothing crashes either way — verified by `backend/tests/test_model_dispatch.py`,
which also loads the real shipped checkpoints as part of the suite
(skipped automatically if they're ever removed).

Before treating either model as production-ready for real users, run
the fairness/bias audit from PRD section 11 (skin-tone and lighting
error rates, not just aggregate accuracy — and especially important
for the detector given its low mAP50) — there's no automated tooling
for that yet.

## Known limitations
- **Detector**: mAP50 0.148 is low. Expect missed lesions, false
  positives, and imprecise boxes. Not suitable for any use where
  detection accuracy matters until retrained/improved.
- **Classifier**: no held-out evaluation metrics have been reported
  here yet (training log lives at whatever `--output-dir` was used on
  Kaggle — copy `training_log.csv` into this repo if you want it
  documented here).
- Neither model has been through the fairness/bias audit in PRD
  section 11.
- Heuristic fallback (when active): not validated against ground
  truth; `dark_spots`/`pigmentation` aren't meaningfully distinguished;
  no region-level analysis (forehead/cheeks/nose/chin).
