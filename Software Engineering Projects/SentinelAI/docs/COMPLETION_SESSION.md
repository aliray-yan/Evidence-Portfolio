# Completed software checkpoint — 12 November 2026

> **Superseded historical checkpoint:** the13November continuation completed INT8 calibration/evaluation, selected faster native execution, and integrated the learned model. Read [current integration and actual results](LEARNED_EXCHANGE_INTEGRATION.md). Statements below describe the12November stop point, not today's model selection.

Read with [the complete project handover](../project%20info%20documentation.md). The owner requested finished, tested increments and documentation when the five-hour **usage allowance** ran out. No training/calibration process was left running. **The project is not fully complete.**

## Active application and completed research

- DINOv2/GRU training finished: 2,460 windows, 16 epochs, selected epoch 4, threshold 0.60. Nine reused detection checks passed; CPU p95 281.10 ms failed the unchanged 250 ms gate.
- A bounded thread experiment and FP32 OpenVINO conversion were executed. OpenVINO preserved the measured outputs but still failed actual-video speed at p95 **255.27 ms**.
- INT8 calibration code and dependencies are saved. **Calibration has not run. No INT8 weights, quality or speed measurements exist.** The research loader deliberately accepts FP32 only.
- No active model configuration changed. The RWF fight model and YOLO/person + MediaPipe/geometry exchange baseline remain operational. The baseline previously missed cash/envelope controls; the trained DINO candidate is not yet the application detector.
- No UI, upload pipeline or streaming transport change was made in this checkpoint. Learned-model installation, operational adapters and 4 Hz integration remain pending. Physical Android testing is still postponed by the owner.

## Exact saved artifacts

Paths are relative to the project root. Ignored `.local` artifacts do not accompany a fresh clone.

| Path | Result / meaning |
| --- | --- |
| `.local/models/exchange-dino-gru-v4-resume1-20261111/` | Original weights, inventory and reports. Manifest SHA-256 `635636276804b88311157b3bcf8415f3f632d0415b73a8dd44717900c8a09586`. |
| `evaluation/visual-training/screening-v4-dino-resume1-20261111.json` | Original failed speed gate; retain it. |
| `.local/exchange-research/external-v4-dino-resume1-20261111.json` | Original actual-video predictions and numerical reference. |
| `.local/exchange-research/cpu-thread-protocol-20261111.json` | Fixed rounds: threads 2/1/3 then 3/1/2, eight warmups and 48 measurements each. Two-thread p95 248.55/230.08 ms; one-thread 299.28/366.08 ms; three-thread 209.79/270.00 ms. |
| `.local/exchange-research/cpu-frozen-feasibility-20261111.json` | Partial trace experiment, no completed frozen artifact; not an approved runtime. |
| `.local/models/exchange-dino-pretrain/encoder.onnx` | Verified source with `onnx-benchmark.json` receipt. SHA-256 `155890f2c55e76738aec47b89b63b15a7dd862ac9f1dd330ac6d546133b577d8`. |
| `.local/models/exchange-dino-openvino-v1/` | FP32 `encoder.xml`, `encoder.bin`, `runtime.json`; fixed 1×3×224×224 input, 1×768 output, no FP16 compression. |
| `.local/models/exchange-dino-openvino-v1/runtime.json` | Eight real-frame feature comparisons passed, max absolute difference 0.00003171, tolerance 1e-4. Microbenchmark p95 244.27 ms. RSS 864,919,552 bytes includes original and converted models, not application memory. |
| `.local/exchange-research/external-v4-openvino-round1.json` | All 138 control timestamps/flags match and score differences stay within 1e-4. Cash/envelope flagged, handshake/normal unflagged. Actual-video sample p95 **255.27 ms: failed**. No rounds 2/3 after that failure. |

Inference timing excludes decoding, streaming and concurrent fight inference. Control wall times include decoding. Thread/export microbenchmarks use repeated features for timing, not behavioral evaluation. Preserve failed results; the four known clips are reused controls, not independent field validation.

## Software saved and verified

| File | Responsibility / boundary |
| --- | --- |
| `sentinel_ml/exchange_bundle.py` | Extracted strict asset validation, optional research CPU runtime, separate bounded temporal state per fork. Bare research bundles still reject operational use. |
| `sentinel_ml/exchange_runtime.py` | Source/artifact hashes, bounded JSON/files, fixed shape/config, finite tensors, pinned imports and declined telemetry. Rejects INT8 pending evaluation support. |
| `training/benchmark_exchange_runtime.py` | Repeatable bounded thread comparison. |
| `training/export_exchange_cpu.py` | Verified ONNX → FP32 IR, numerical checks and microbenchmark; no fitting/activation. |
| `training/evaluate_learned_exchange.py` | Runtime-tagged actual controls and source/model/timestamp-bound numerical comparison. |
| `training/quantize_exchange.py` | Offline candidate generator with deterministic training-only selection and provenance. Generator unexecuted; selection unit tests do not establish NNCF quality. |
| `training/exchange_report.py` | Rejects runtime-tagged controls instead of incorrectly inheriting original held-out metrics. Runtime-specific screening remains to be implemented. |
| `tests/test_exchange_runtime.py` | Integrity, finite values, calibration isolation, stream-history isolation, report separation and actual vendor-import privacy checks. |

### Dependencies and privacy

Installed OpenVINO **2025.4.1**, openvino-telemetry **2025.2.0**, NNCF **2.18.0**; NumPy remains **1.26.4**. Optional pins: `requirements-exchange-runtime.txt`, `requirements-exchange-quantization.txt`. Base application dependencies are unchanged. `pip check` found no broken requirements.

Always call `private_openvino()` before importing OpenVINO/NNCF in a fresh process. Ordinary vendor import can initialize telemetry. The pinned adapter forces declined consent in this process without modifying host settings and rejects importing OpenVINO first. An actual subprocess test passed with network connections, consent-directory writes, consent updates and prompts trapped. This is a tested compatibility adapter, not a host-wide firewall. Initial conversion before the wrapper ran sandboxed; logs reported settings-write denial and no data sent.

Official references: [OpenVINO CPU execution](https://docs.openvino.ai/2025/openvino-workflow/running-inference/inference-devices-and-modes/cpu-device.html), [IR conversion](https://docs.openvino.ai/2024/openvino-workflow/model-preparation/convert-model-to-ir.html), [NNCF quantization](https://docs.openvino.ai/2024/openvino-workflow/model-optimization-guide/quantizing-models-post-training/basic-quantization-flow.html). No new dataset or participant footage was downloaded in this checkpoint.

### Executed checks on 12 November

- **365 Python/backend/training/runtime tests passed**, 80.17 seconds, one expected duplicate-ZIP-member warning. Pytest also reports an inherited asyncio fixture-scope deprecation at startup. Logs: `.local/exchange-research/full-tests-20261112.log` and matching XML.
- **31 frontend tests passed**, eight files. Log: `.local/exchange-research/frontend-tests-20261112-approved.log`.
- TypeScript and Vite production build passed: `.local/exchange-research/frontend-build-20261112.log`.
- Installed FP32 model smoke check passed on eight actual cash-control frames after runtime hardening: finite output, timestamps 0–1.75 seconds retained, fork history isolated, no action boxes invented. Receipt: `.local/exchange-research/runtime-smoke-20261112.json`. This is execution verification, not another accuracy/speed measurement.
- Documentation checks: all 255 files returned by `rg --files` are named in the main handover; relative links in the six updated documents resolve; code fences balance. Hidden/generated/private directories are described separately. `git diff --check` found no whitespace errors in tracked changes.
- Initial focused run: 47 passed / 1 failed because the test omitted a vendor `send_event` argument. Corrected before the full passing run; no privacy failure suppressed. Initial frontend sandbox read denial was resolved by an approved rerun.
- Browser E2E, sustained streaming and physical Android were **not rerun** here. Prior dated results remain in existing verification documents. Software checks are not model-accuracy measurements.

## Next experiment — declared, not executed

1. Implement and test runtime-specific evaluation/screening first. Bind source bundle, inventory, calibration and runtime hashes; verify exact reserved IDs/labels, known architecture, threshold and finite scores; recompute per-source confusion counts. Do not reuse original `test.json` for changed encoder outputs.
2. Fixed NNCF 2.18.0 transformer/mixed/CPU calibration: **32 training windows**, seed 42, sorted IDs before shuffle, round-robin dataset/class groups, eight RGB samples each (**256 frames**). No dev/test/stock calibration. Distinct windows are not necessarily independent people.
3. Keep original head, 224-pixel RGB preprocessing, eight samples at 4 Hz and threshold 0.60. INT8 is not FP32 numerical equivalence; do not use the old `--reference` equality gate for it.
4. Re-evaluate all **460 reserved windows** using the actual quantized encoder and unchanged head, then all four controls and three declared timing rounds. Preserve existing quality and 250 ms speed gates, failures and reused-evaluation labels. No threshold tuning against these tests.
5. Only after passing: implement explicit trusted local-review installation and upload/live adapters; actual timestamps, 4 Hz sampling, bounded queues/gap resets, honest model-score/coverage labels, audit and permissions. Learned window scores supply **no action boxes or currency/intent recognition**.
6. Verify actual upload/review/report and sustained streaming with R3D-18 active. Measure memory, CPU, drops, late results, latency and normal playback. Obtain fresh source-separated visual evaluation and finish application acceptance checks.
7. Resume physical Android testing afterward, in the owner's requested order. Broader deployment/security/field validation remain separate documented limits.

Calibration command for future supervised continuation, **not already run**:

```powershell
.\.local\runtime\Scripts\python.exe -u -m training.quantize_exchange --bundle .local/models/exchange-dino-gru-v4-resume1-20261111 --runtime .local/models/exchange-dino-openvino-v1 --dataset .local/datasets/exchange --output .local/models/exchange-dino-int8-v1
```

It refuses an existing output folder. Preserve failed/partial candidates and choose a new directory rather than erasing prior results. No calibration/evaluation is scheduled automatically. `watch-training.cmd` describes the **completed original DINO job**, not this pending optimization.

## Recheck and start

From the project directory:

```powershell
.\.local\runtime\Scripts\python.exe -m pip check
.\.local\runtime\Scripts\python.exe -m pytest
npm.cmd test
npm.cmd run build
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Open `http://127.0.0.1:8000` after starting; keep one server process. Do not reset data, encryption keys or model selection to continue. See the main README/Android guide for phone HTTPS and role setup. Preserve original failures, private files, licenses and vision-only scope. Passing software checks does not complete reliable bribery recognition or production readiness.
