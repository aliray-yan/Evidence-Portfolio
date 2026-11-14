# Local visual AI setup

Updated 6 November 2026. The active pipeline is vision-only; [VISION_ONLY.md](VISION_ONLY.md) is the current scope and evaluation record. Audio models are no longer selected or run, even if legacy settings/weights remain on disk. Installation never downloads models inside a processing job.

Use Python 3.11 in the same environment that starts the backend:

```powershell
python -m pip install -r requirements.txt -r requirements-vision.txt -r requirements-ai.txt -r requirements-exchange.txt -r requirements-streaming.txt
python -m backend.setup_models --download
python -m backend.setup_exchange --download
python -m backend.setup_streaming --bridge
```

Import the trusted Kaggle RWF bundle separately with `backend.model_import --activate`. Restart after selection. Empty explicit environment variables disable a selected component. `.local/ai-selection.json` contains model paths, source URLs and hashes, not a scientific accuracy certification.

| Component | Implemented use | Limit |
| --- | --- | --- |
| Imported R3D-18 | 16 RGB frames over five seconds, development-selected threshold | Fight/nonfight clip score; no action boxes, currency, identity or guilt |
| YOLO26n + MediaPipe hands + transfer rules | Person/hand associations and rectangular-patch motion at 2 fps | Experimental; actual cash-control miss. No trained transfer/currency model |
| MediaPipe hand/pose | Neutral hand shapes and pose landmarks in uploaded cases | No intent or adverse gesture-only assessment |
| SSDLite320 COCO | Knife/scissors candidates in uploads | No firearm or weapon-use class; review required |
| Face detector | Silent selective-mask preview with human release/revocation | Faces/other identifiers may be missed; full-frame blur remains default |
| Optional E5 retrieval | Search existing evidence with exact source excerpts | No new transcripts, incident interpretation or guilt classification |

MediaPipe is pinned to 0.10.21 with the verified NumPy/OpenCV dependencies. Newer wheels were observed attempting telemetry in earlier public-fixture checks; see [upstream issue](https://github.com/google-ai-edge/mediapipe/issues/6291). Inference uses local assets; YOLO downloads/integrations are disabled. Host outbound restrictions remain appropriate for sensitive deployments. This workstation inherits some system Python packages; clean environments should use the pinned requirements rather than unrelated OpenCV distributions.

Optional text retrieval can be installed with `python -m backend.setup_language_models --download --only retrieval`. The former diarization installation option has been removed. Optional cloud reading assistance is separate, manual and limited as documented in [OpenRouter](OPENROUTER.md).

```powershell
python -m backend.verify_ai --download-fixtures
python -m backend.verify_pipeline --video .local/visual-exchange-evaluation/cash.mp4
python -m backend.evaluate_exchange --directory .local/visual-exchange-evaluation
```

The first command tests public hand/pose/face fixtures. The second uses an isolated database and actual installed models, checks protected artifacts, no audio-derived results, original deletion and audit integrity. The third records actual outcomes, including missed transfers. These are technical checks, not independent policing-domain accuracy. Training/evaluation requirements and stock attribution are in [VISION_ONLY.md](VISION_ONLY.md).
