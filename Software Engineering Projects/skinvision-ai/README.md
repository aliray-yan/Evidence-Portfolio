# SkinVision AI

An AI-assisted, non-diagnostic visual skin analysis app, built from the
attached PRD. Real FastAPI backend, real Next.js frontend, and — as of
this version — real trained models, wired in and active by default.

## Current status

| Piece | Status |
|---|---|
| Frontend (Next.js, all 3 screens, full upload flow) | Real, working |
| Image quality checks (face detection, blur, brightness) | Real, working (OpenCV) |
| Rule-based recommendation engine | Real, working |
| API contract, validation, error handling | Real, working |
| Skin-concern classifier (9 labels, EfficientNet-B0) | **Real trained checkpoint, active by default** |
| Lesion detector (bounding boxes, YOLOv8n) | **Real trained checkpoint, active by default — but experimental: validation mAP50 = 0.148** |

Both models were trained on Kaggle (Tesla T4). If either checkpoint is
ever missing or fails to load, the backend automatically falls back to
a heuristic computer-vision placeholder rather than crashing — see
[`docs/model_card.md`](docs/model_card.md) for exactly how that works,
what the detector's low mAP50 means in practice, and a bug this update
fixed (the detector's real classes didn't match an earlier hardcoded
assumption and were causing 500 errors on real detections).

## Running it locally

See [`QUICKSTART.md`](QUICKSTART.md) for full, copy-pasteable setup —
**you do not need to train anything to run the app** (trained
checkpoints are already included). Short version:

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-ml.txt   # needed for the trained models
uvicorn app.main:app --reload --port 8000
```
Runs the test suite:
```bash
pytest
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
Open http://localhost:3000. The frontend expects the backend at
`http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL`).

## Project layout
```
backend/    FastAPI app — quality checks, classifier/detector, recommendations
  app/ml_models/   Trained checkpoints live here (classifier + detector)
frontend/   Next.js 14 (App Router) + Tailwind v4 + Motion
docs/       Model card, privacy notes, dataset audit template
ml/         Dataset audit + training scripts (for retraining/improving either model)
QUICKSTART.md   Full step-by-step, including retraining and troubleshooting
```

## What's not built yet
- **A better detector.** mAP50 0.148 is low — usable as a demo, not
  reliable. Retraining with more epochs, more data, or a larger base
  model (yolov8s/m instead of yolov8n) is the natural next step; see
  `ml/README.md`.
- The fairness/bias audit from PRD section 11 — hasn't been run on
  either trained model yet.
- Deployment/infra (PRD section 21 phases 11-13).

## Privacy
No uploaded photo is ever written to disk or logged by the backend —
it lives in request memory only, per the PRD's privacy requirements.
See [`docs/privacy.md`](docs/privacy.md).
