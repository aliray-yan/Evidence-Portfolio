# Changelog

## Unreleased — real trained models wired in + a real bug fix
- **Real trained checkpoints shipped and active by default**
  (`backend/app/ml_models/`, `backend/.env` sets
  `SKINVISION_MODELS_ARE_TRAINED=true`). Classifier: EfficientNet-B0,
  all 9 canonical labels, trained on Kaggle/Tesla T4. Detector:
  YOLOv8n, trained on Kaggle/Tesla T4, 67 epochs with early stopping —
  **validation mAP50 = 0.148, experimental**.
- **Fixed a real bug**: the detector's actual trained classes
  (`blackheads`, `dark spot`, `nodules`, `papules`, `pustules`,
  `whiteheads`) didn't match a hardcoded `Literal["comedone", "papule",
  ...]` in the API schema, causing a 500 error on every real detection.
  Reproduced the exact failure, then fixed it properly: `LesionClass`
  is now a plain string end to end (backend schema + frontend types),
  since detector classes are inherently whatever the loaded checkpoint
  was trained with — a fixed enum was the wrong shape from the start.
  Frontend gracefully displays unknown classes with a title-cased
  fallback instead of requiring a code change per class name.
- **Fixed a second real bug**: `backend/.env` wasn't actually being
  read — `pydantic-settings` needs `env_file=".env"` explicitly
  configured, which was missing. Added, plus `python-dotenv`.
- `model_status.note` now surfaces a configurable quality caveat
  (`SKINVISION_DETECTOR_QUALITY_NOTE`) whenever the trained detector
  serves a response, so the low mAP50 is visible to whoever's using
  the app, not just documented in a file nobody reads.
- Verified end-to-end against the real checkpoints in this sandbox
  (installed torch/torchvision/ultralytics without their normal CUDA
  dependency bloat by using `--no-deps`, working around a real disk
  constraint): classifier correctly flagged `acne` at p=1.0 on a real
  "inflammatory acne" sample image; detector returned valid, correctly
  schema'd detections on the same image.
- `backend/tests/test_model_dispatch.py` now also loads the real
  shipped checkpoints as part of the suite (auto-skipped if they're
  ever removed) — this is the test that would have caught the label
  mismatch bug above.
- Two existing tests were quietly assuming heuristic mode was always
  the default; fixed to explicitly set up the state they test instead
  of asserting on ambient config, since that assumption stopped being
  true the moment real checkpoints shipped.

## Unreleased — real training code + backend swap-in wiring
- ML: complete, runnable training scripts — `ml/train_classifier.py`
  (PyTorch, EfficientNet-B0, multi-label) and `ml/train_detector.py`
  (Ultralytics YOLOv8). Manifest/data-prep tooling
  (`ml/data/prepare_classification_manifest.py`, `make_data_yaml.py`,
  `merge_manifests.py`) plus ready-made label mappings for the PRD's
  named Kaggle datasets (A/B/D) in `ml/data/mappings/`.
- Backend: `model_loader.py` lazily loads trained checkpoints if
  present; `classifier.classify()` / `detector.detect_lesions()` now
  try the trained path first and fall back to the heuristic
  placeholder automatically (missing checkpoint, missing optional
  deps, or a load/inference failure all degrade safely, never crash).
  `model_status` in the API response is now computed per-request from
  what actually ran, not just the config flag, so a failed load can
  never be misreported as "trained".
- New tests (`backend/tests/test_model_dispatch.py`) proving the
  fallback works with torch genuinely absent.
- New `QUICKSTART.md` — full step-by-step from a fresh checkout to a
  running app, running tests, training real models, and wiring them
  into the backend.

## 0.1.0-mvp — initial scaffold
- Backend: FastAPI app with real image-quality assessment (face
  detection, blur, brightness via OpenCV), a rule-based recommendation
  engine, and heuristic (non-trained) classifier/detector placeholders.
  Full test suite (`backend/tests`).
- Frontend: Next.js 14 (App Router) + Tailwind v4 + Motion. Landing
  page, upload/analyze flow with client-side validation, and a results
  dashboard with an original/AI-findings image toggle and bounding-box
  overlay.
- Docs: model card, privacy notes, manual dataset-audit checklist.
- ML: runnable dataset audit script (`ml/dataset_audit.py`); no trained
  model yet — see `ml/README.md`.

## Not yet done
- A better detector — mAP50 0.148 leaves a lot of room; see
  `ml/README.md` for retraining options.
- Deployment/infra.
- Automated fairness/bias evaluation tooling (Dataset F is identified
  for this in `ml/README.md`, but there's no script yet).

