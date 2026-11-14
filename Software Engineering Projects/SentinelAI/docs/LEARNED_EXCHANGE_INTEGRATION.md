# Learned visual-transfer integration — 13 November 2026

The trained DINOv2/GRU detector is now installed for local FYP review at
`.local/models/exchange-reviewed-9dcdef5530fa`, selected by
`.local/ai-selection.json`. Restart the application to load the selection.
There is no additional training job to wait for. Android retesting remains last.

This model classifies possible object-transfer windows, **not currency, intent,
bribery or guilt**. Ordinary legitimate transfers can be flagged. Alerts keep the
required pending-human-review label, an uncalibrated model score, actual timestamps
and evidence references. It supplies no action bounding boxes. New processing
and streaming remain vision-only, without microphone or speech analysis.

## Why native execution was selected

The earlier original and OpenVINO FP32 runs failed the 250 ms per-sample p95
budget. NNCF INT8 calibration completed using 256 frames from 32 training windows
only. Its own complete 460-window reserved evaluation passed the quality checks:
Cornell TP112/FN8/FP9/TN213, SBU TP3/FN1/FP0/TN24 and CAP FP0/TN90.
Nevertheless it failed repeated CPU speed checks. Compression did not establish
a usable speed improvement on this i5-8265U laptop.

Power and decoding were investigated explicitly. The initial battery/mixed runs,
the three AC-powered runs and three single-decoder-thread INT8 runs are all kept
under `evaluation/visual-training/screening-v4-int8-*-20261113.json`. Failed runs
were not replaced with successful ones. The owner connected the charger between
the battery/mixed and declared AC protocols.

Original Torch execution with two inference threads, one OpenCV thread, one
FFmpeg decoder thread and forward sequential decoding passed **three declared
AC-powered actual-video runs**. Per-sample nearest-rank p95: **147.67, 147.30,
141.61 ms**. All 138 control predictions in each run exactly retained their
original scores, flags and sampled timestamps. No model weights, threshold0.60,
RGB preprocessing, eight-frame window or 4 Hz sampling were changed.

The native profile reuses the exact original cached-feature reserved predictions;
it does **not** claim a new 460-video inference run. Every ID, label, score and
aggregate report is checked against the frozen inventory and original report.
The original model's Cornell result is TP112/FN8/FP10/TN212, SBU TP3/FN1/FP0/TN24,
CAP FP0/TN90. The distinction from the separately measured INT8 result matters.

These are reused laboratory/stock evaluations, with only four positive SBU
examples. They are neither independent field accuracy nor a policing validation.
The four stock controls remain attributed in [vision-only verification](VISION_ONLY.md).
Cash and envelope transfers were detected; handshake and normal controls were
unflagged. An envelope/document transfer is not evidence of bribery.

## Integration and safeguards

- `backend.exchange_import` accepts an explicitly supplied trusted local bundle,
  rechecks assets/libraries/evaluation and all three performance runs, builds a
  verified installation, then optionally selects it. Editing a manifest flag
  cannot activate a bare research bundle. This is local operator trust, not a
  cryptographically signed model certification service.
- `backend.exchange_adapter` chooses the explicitly selected learned detector.
  An invalid selection produces an error; it does not silently use the old
  geometric baseline. Without a learned selection, the baseline remains available.
- `backend.learned_exchange` shares weights but forks independent bounded stream
  history. Eight genuine consecutive samples are required; a gap over0.4s resets
  history. Complete overlapping windows are scored, while emitted candidate
  alerts are limited to one per two source seconds. Missing coverage is not a
  negative finding. Uploaded events merge overlapping flagged windows.
- Upload and original-stream processing use the same model. Sampling cadence
  maintains four samples/second at15fps without accumulated rounding drift.
  Source RTP timestamps, current connection epoch, queue limits, late-result
  rules, protected replay and explicit case preservation remain intact.
- Dashboard coverage distinguishes model scores from heuristic support and shows
  learned windows, history resets and measured exchange result latency. The
  viewing-buffer recommendation considers both detectors and stays capped at4s;
  video playback never waits for inference.
- Model/library/source hashes and screening records travel with the installation.
  Previous selection is backed up at `.local/ai-selection.before-learned-exchange.json`.
  Explicit empty `SENTINEL_LEARNED_EXCHANGE_MODEL` disables learned selection for
  that process; do not delete or overwrite research results to roll back.

## Executed verification

- **384 Python tests passed**, one expected duplicate-ZIP-member warning.
  `.local/exchange-research/native-full-tests-20261113.xml` is the machine receipt.
- **31 frontend tests passed**; production build passed. Initial sandbox denial
  prevented the build tool from reading a parent directory; the approved rerun
  passed. No source failure was hidden.
- The earlier complete **14 browser journeys passed** on12November. New coverage
  rows require the current sustained run's rendered check; do not treat the old
  screenshot as proof of the later rows.
- Actual installed-model upload: **30.186 seconds**, detected learned transfer,
  zero transcript segments, four protected artifacts, deleted original, valid
  audit chain. Isolated case `SA-26-F3FCF36B`; report
  `.local/ai-verification/learned-native-pipeline-20261113.json`.
  `partial` is intentional: unavailable capabilities remain disclosed.
- Ten-minute combined stream test is being executed in this continuation.
  Read `.local/live-benchmark/native-learned-20261113/report.json` and
  `.local/exchange-research/native-stream-20261113.log` for actual completion.
  A repeated attributed stock control is used, not an Android camera or fresh
  accuracy test. Completion also requires replay and preservation assertions.

## Reproduction

Use the project's Python environment and keep this laptop plugged in. Run heavy
benchmarks separately from tests/training. Source research footage and weights
remain in ignored `.local` storage; a fresh clone does not contain them.

```powershell
.\.local\runtime\Scripts\python.exe -m backend.verify_pipeline --expect-learned-transfer --output .local/ai-verification/new-learned-check.json
.\.local\runtime\Scripts\python.exe -m pytest
npm.cmd test
npm.cmd run build
```

For an independently re-created installation, read the fixed native protocol
`evaluation/visual-training/cpu-native-protocol-20261113.json`, run all three
`training.evaluate_learned_exchange` rounds, register the unchanged execution
with `training.register_native_exchange`, screen using
`training.screen_exchange_runtime`, then use `backend.exchange_import --activate`.
Each CLI exposes `--help`. Existing reports are protected against overwriting.
Pinning in `requirements-exchange-dino.txt` supplies the native model libraries;
the native receipt also verifies their exact installed versions. OpenVINO/NNCF
are optional research dependencies and are not used by the selected model.

## Remaining boundaries

Independent source-separated validation, event-onset accuracy, continuous false
alarms/hour, occlusion/viewpoint/lighting tests and reviewer agreement are still
research work. Current timing supports this laptop under the measured conditions,
not every8GB computer or battery operation. Physical Android streaming/reconnect
testing stays last. Currency recognition and guilt determination are not
implemented capabilities; do not describe them as successful model outputs.
