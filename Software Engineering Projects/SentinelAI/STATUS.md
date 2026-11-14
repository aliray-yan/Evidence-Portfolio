# Implementation status

Updated **13 November 2026**. The revised vision-only requirement supersedes the earlier audio/multimodal PRD. SentinelAI is a persistent FYP application; **reliable visual bribery recognition and full production readiness are not complete**.

Full requirements, file catalog, assets and continuation instructions: [project handover](<project info documentation.md>).

## Current learned-model integration — 13 November

- Native DINOv2/GRU passed three declared actual-video CPU runs: p95 **147.67 / 147.30 / 141.61ms**, with all138 scores/flags/timestamps per run unchanged. Sequential one-thread decoding and two-thread native inference are selected; the compressed INT8 candidate remains unselected after failed speed checks.
- INT8 calibration and its complete460-window reserved evaluation were executed. Detection gates passed; CPU gates did not. Original failures and all subsequent power/decoder protocols are preserved.
- `.local/models/exchange-reviewed-9dcdef5530fa` is installed and selected for local FYP review. Strict installation/library/asset checks, upload/live adapters,4Hz cadence, source timestamps, gap resets and explicit coverage/model-score labels are implemented.
- Actual learned-model upload **passed in30.186s**: transfer flagged, four protected artifacts, zero transcript segments, original deletion, valid audit. This is integration evidence, not independent accuracy.
- **384 Python tests,31 frontend tests and production build passed.** Current combined10-minute stream/queue measurements and exact receipts: [integration note](docs/LEARNED_EXCHANGE_INTEGRATION.md).
- Android retesting remains last. Independent field generalization, currency recognition and production readiness are not complete.

## Historical software checkpoint — 12 November

- Added optional research FP32 OpenVINO export/runtime, bounded thread benchmarking and saved training-only INT8 calibration tooling. This does not alter active application models.
- FP32 real-frame checks and all 138 known control predictions agreed with the original within tolerance, but actual-video p95 **255.27 ms** still failed the unchanged 250 ms limit. INT8 calibration and evaluation have not run; its profile remains rejected by the runtime loader.
- Added integrity, finite-value, calibration split-isolation, independent stream-history and runtime-report checks. A changed runtime cannot inherit the original encoder's held-out report. Pinned vendor import explicitly declines telemetry without changing host settings; the exercised privacy test forbids network connections, consent writes and prompts.
- **365 backend/training/runtime tests passed**, one expected duplicate-ZIP-member warning; **31 frontend tests passed** and TypeScript/Vite production build passed. The initial privacy-test call used the wrong vendor method signature; corrected before the full passing run. Frontend sandbox access failed initially; the approved rerun passed. No new physical-phone or sustained-stream run is claimed.
- `pip check` found no broken requirements. No training/calibration process was left running. [Exact saved artifacts, commands and next steps](docs/COMPLETION_SESSION.md).
- An actual eight-frame FP32 runtime smoke check passed after the safeguards were added: finite score, retained source timestamps, isolated temporal history and no invented boxes. This verifies execution, not detection quality or a passing speed gate.

## Implemented

| Area | Current behavior |
| --- | --- |
| Application | React/FastAPI/SQLite, five server-enforced roles, sessions/CSRF, dashboard/queue, protected media/reports, notes, assignment, decisions, escalation, independent appeals and audit |
| Capture/upload | Existing video and camera-only recording, consent, resumable transfer, persistent processing, validation/deduplication/retry; microphone access disabled |
| New analysis | Vision-only: no ASR, Whisper, audio/speaker/phrase/conversation analysis or audio-video fusion; old settings cannot re-enable these |
| Fight model | User-trained RWF R3D-18, 16 samples over five seconds; genuine CPU inference; clip scores with no fabricated action boxes |
| Visual exchange baseline | Verified YOLO26n people, MediaPipe hands, geometric object proposals and temporal transfer rules; exact pending-human-review label, timestamps, real boxes and protected snapshot/clip references |
| Custom exchange training | Attributed SBU/Cornell/CAP/UT data; frozen splits, three rejected MobileNet candidates and a screened native DINOv2/GRU now selected for FYP review. No currency, intent or guilt classifier; independent field validation remains |
| Streaming | MediaMTX WHIP/WHEP, same original video analyzed independently, source RTP timing, bounded queues/ring, normal-speed playback, requested 0–4 second buffer, late alerts, replay and explicit case preservation |
| Evidence/privacy | Encrypted media/results, silent blurred default derivatives, controlled selective-face review, reviewer-only clear live evidence; originals deleted after successful processing |
| Alerts/governance | Local acknowledgement/assignment/escalation/resolution, versioned policies, protected audit, retention/legal holds, tested backup/restore; external delivery only if explicitly configured and confirmed |
| Historical evidence | Old transcripts/decisions preserved, read-only legacy phrase library, source-linked search and optional manual reading guide; none supplies new bribery detection |

## Verified in the vision-only change

- Full backend suite: **316 passed**, one expected duplicate-archive-member warning. Includes legacy research regressions; it is not 316 model-accuracy scenarios.
- Subsequent focused media/streaming/privacy checks: **16 passed** after silent normalization and permissions-policy changes.
- Preserved-live-evidence checks: **4 passed**, including actual video reprocessing when the exchange model is unavailable. The original saved finding and mapped timestamps remain intact.
- Frontend suite: **31 passed**. Production build executed successfully.
- All **14 non-benchmark browser journeys passed across the initial run and focused reruns**. Initial selector/camera-fixture failures were corrected; this is not a claim of one final 14-test run. The final two-browser camera-only stream check passed again after label/error-recovery fixes, including desktop/phone axe scans and a synthetic late-result snapshot check. The camera recording/upload/privacy journey also passed after waiting for the recorder's actual start event.
- Actual installed-model upload: **34.909 seconds**, zero transcript segments, four protected artifacts, valid audit chain and original deletion. The isolated report is `.local/ai-verification/vision-only-pipeline.json`.
- Four stock-video model controls executed: money handover **missed**; ordinary envelope transfer also **missed**, with zero object proposals despite detected people/hands. No flags on handshake/normal controls, but limited coverage prevents claiming successful negative discrimination. All four downloads have verified source attribution and checksums. [Full limits](docs/VISION_ONLY.md).
- Browser and sustained-stream results are recorded in [live verification](docs/LIVE_VERIFICATION.md); historical audio-enabled measurements are explicitly separated from the current profile.
- Current ten-minute stream rerun **passed**, including replay/preservation: 600.111 seconds of playback in 601.580 seconds wall time; median violence inference 2.938 seconds. It still skipped 25 violence windows and 317 exchange samples. A preceding run timed out after an interruption. This verifies one synthetic local stream, not uninterrupted physical-phone reliability or complete detection coverage.
- Startup rechecked on 8 November using `start.ps1`: desktop page and public configuration returned HTTP 200 at `http://127.0.0.1:8000`; unauthenticated case access returned 401. The app is a local demo instance. Current Wi-Fi address is `192.168.1.30`, while the earlier phone certificate names `192.168.1.9`; phone HTTPS must be prepared for the current address before retesting. See [Android setup note](docs/ANDROID_QUICK_TEST.md).

## Training continuation — 11 November

- Re-executed the complete backend/training suite after dependency repairs:
  **348 passed**, one expected duplicate-ZIP-member warning. The subsequent
  focused suite including resume/cache and process-identity guards passed **34 tests** in 13.08 seconds.
  `pip check` reports no broken requirements. These are software checks, not
  detection-accuracy results.
- Three completed custom learned models remain rejected. The third detects
  cash/envelope stock transfers but still falsely flags the handshake; its SBU
  recall drops to 2/4. [All measured results](docs/EXCHANGE_MODEL_EVALUATION.md).
- The resumed DINOv2 run **completed all 2,460 windows and 16 epochs**; selected
  epoch 4 and threshold 0.60. Automatic evaluation finished at 14:50 Pakistan
  time on 11 November. Cornell: 112/120 transfers, 10/222 false positives. SBU:
  3/4 transfers, 0/24 false positives. CAP: 0/90 false positives. All four stock
  controls passed, including the previously failing handshake. These evaluations
  are reused and do not establish field accuracy.
- **The model stays disabled:** per-sample CPU p95 was 281.10 ms, above the fixed
  250 ms limit. All detection gates passed, but overall screening failed on speed.
  [Completed report](evaluation/visual-training/screening-v4-dino-resume1-20261111.json).
  The next step is CPU optimization and performance validation without changing
  the trained weights, sampling contract or decision threshold. Training and the
  monitor have finished; `watch-training.cmd` shows the final failed speed check.
- Physical Android retesting remains postponed. It is **not yet the only
  remaining issue** because reliable visual-exchange recognition is unresolved.

## Outstanding acceptance items

1. **Learned-model performance, integration and generalization.** The fourth candidate passes the reused detection checks, including cash/envelope and handshake discrimination, but fails the 250 ms CPU limit (281.10 ms p95). It remains research-only. Optimize and benchmark the frozen model, then validate upload/live integration and fresh independent recordings. Currency identification and illegality remain unsupported; changing a threshold on known footage would not establish reliability. [Measured experiments](docs/EXCHANGE_MODEL_EVALUATION.md). No English/Pakistani language accuracy claim applies to a vision-only detector.
2. **Improved object proposals and discrimination.** The newly tested envelope control closes the missing-footage check, but its missed transfer exposes the same object-detection gap as the cash control. More independent cash, document and handshake recordings are needed; four stock clips cannot establish accuracy.
3. **Physical continuous Android testing.** Earlier file uploads and a short camera recording were user-confirmed and verified in storage. Continuous WebRTC, camera-only recording after this change, interrupted Wi-Fi and sustained physical-device performance still need confirmation. Browser simulations are not phone validation.
4. **Independent model evaluation.** RWF exported holdout metrics describe that dataset only. Policing-domain fight quality, false alarms per hour, visual exchange recall, privacy masking quality and reviewer agreement require independent annotated recordings. There is no trained spatial violence detector, firearm-use, identity, intent or guilt model.
5. **Deployment.** Production HTTPS/host-disk encryption, secret management, external delivery receipts, independent security/accessibility/load review, multi-tenant isolation, MFA/SSO, arbitrary CCTV camera onboarding and multi-camera capacity remain outside the verified local build.

The Mixkit stock footage is for evaluation only, never training or accusations about performers. Separately attributed research datasets supply training/development/test records. No emergency service is contacted automatically. See [current setup](README.md), [vision-only details](docs/VISION_ONLY.md), and [live streaming](docs/LIVE_STREAMING.md).
