# Executed verification

**Vision-only revision, 5–6 November 2026:** 316 backend tests passed (one expected duplicate-archive warning); 16 focused tests subsequently passed after microphone-policy/silent-normalization changes. Frontend tests: 31 passed; production build executed. Actual installed-model stock-video upload completed in 34.909 seconds with zero transcripts, four protected artifacts, original deletion and valid audit. Earlier speech measurements below are historical. Current stock failures/attribution: [VISION_ONLY.md](VISION_ONLY.md). Live profile: [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md).

**Follow-up checks:** four preserved-visual-evidence tests passed, including real video reprocessing with no exchange model while retaining the original live finding. All fourteen non-benchmark browser journeys passed across the original run and focused reruns; the initial full run had ten passes and four failures, not a clean full pass. Obsolete transcript/navigation selectors were updated, and camera recording was corrected to start its timer on the real recorder start event with a video-only browser fixture. The final capture journey passed in 27.1 seconds; the final two-browser stream/late-snapshot/accessibility check passed in 1.4 minutes. The latter deliberately injects a labeled synthetic finding to verify rendering; it is not real positive detection. The production build after the two review fixes passed (417.10 kB JS, 126.24 kB gzip; 55.11 kB CSS, 12.50 kB gzip).

The first ten-minute vision-only benchmark did **not** pass: it produced 97 violence windows, later lost the stream, and timed out at 720 seconds. Its incomplete progress and failure report are retained in `.local/live-benchmark/vision-first-failed-*.json`. The benchmark harness now checkpoints measurements, stops on lost publishing, and uses elapsed measurement time rather than sixty sleep-plus-request cycles. Current rerun results are recorded in [live verification](LIVE_VERIFICATION.md); earlier audio-enabled figures must not be substituted.

## Android file upload and English development checks — 2 November 2026

The user installed the temporary local CA, reached the HTTPS sign-in page on Android over the same Wi-Fi, and submitted EN-02. The persisted physical-phone case **SA-26-2E231BA0** contains four local-Whisper transcript segments, three payment/concealment phrase indicators and anonymous speaker turns. It is **partial / Ambiguous / awaiting review**, with a full-frame-blurred review copy. No human decision or external delivery was fabricated. Physical live-camera, interrupted-Wi-Fi and human-operated desktop review remain unverified.

The phone copy had a different checksum from the supplied original and was not automatically recognized as a test. Its provenance was corrected with an append-only operator audit entry; model outputs and decisions were unchanged. The dedicated mobile instance now forces **all new uploads** to test recordings, covering converted phone files. The general instance still uses uploader declaration or known fixture hashes. Test cases cannot send external incident notifications; the mobile helper also clears cloud/provider credentials.

Two independent software clients also exercised the actual Wi-Fi-IP HTTPS listener with explicit CA verification, password sessions/Secure cookies, resumable upload, idempotent completion, protected media, role restrictions and labeled report export. EN-01 and EN-02 ran the installed local models and persisted their evidence. This check is a PC-side network test, separate from the user's physical submission. Results: `.local/mobile-test-20261102/verification.json`. The first attempt used an incorrect report URL in the verification script; correcting it allowed the workflow to complete without reprocessing or duplicating EN-01.

Ten newly authored English MP4s were checked through actual local Whisper small CPU/int8 plus the phrase rules. **10/10 authored routing expectations matched**; **4 word errors / 232 reference words (1.72% WER)**; **118.309 seconds total**. These are development fixtures made alongside the rules, not independent English accuracy, police-domain validity or a comparison with Urdu/Punjabi. Source checksums, actual transcripts and events are in `.local/ai-verification/english-development-check.json`. See [the test pack and limitations](ENGLISH_VALIDATION.md).

The UI now supports explicit existing-video selection without forcing Android camera capture, local preview/removal, recovery after invalid selection, authenticated test-file downloads and test provenance. An empty camera recording produces an actionable retry error and is not presented as ready. Desktop/390px screenshots and the generated video frame were inspected. The expanded accessibility scan passed with zero violations after allowing 120 seconds for its seventeen states; its earlier 60-second run timed out under concurrent checks.

The initial browser camera test returned zero bytes from Chromium's default simulated microphone. Explicit video **and audio** fixtures resolved the test-device problem; recording, upload and real privacy processing then passed in an isolated rerun. The empty-recording safeguard remains implemented. This does not establish physical Android microphone/camera compatibility. An earlier frontend test emitted the details-toggle event twice; it was corrected to use the native event. These failures are not counted as passing runs.

Final post-fix checks: **287 backend tests passed in 55.30 seconds**, no failures or skips; **29 frontend tests passed in 12.04 seconds**; **13 browser tests passed in 2.9 minutes**, no failures, skips or retries; production TypeScript/Vite build passed (**397.63 kB JS / 119.73 kB gzip**, **50.42 kB CSS / 11.60 kB gzip**). The browser suite includes seventeen-state accessibility, existing-video playback/download/upload, invalid selection, interrupted transfer, camera recording, review, alerts and account boundaries. The intentional duplicate-ZIP fixture warning and installed pytest plugin notice remain non-failing. Setup, account access and remaining phone checks: [Android quick test](ANDROID_QUICK_TEST.md).

## Local speaker turns and evidence search — 2 November 2026

- **258 backend tests passed in 42.92 seconds**, no failed or skipped tests. Coverage includes uncertain/overlapping speaker attribution, configured-model recovery, encrypted index persistence, exact Unicode excerpts, CSRF and case/health scope, stale sources/models, corrupt vectors, busy-model recovery, access revoked during inference, retention during indexing, restart recovery, size validation, speaker DER, reviewer agreement and maximum one-to-one event matching. The existing intentional duplicate-ZIP warning and installed pytest plugin loop-scope notice remain non-failing.
- **22 frontend tests passed** in 6.19 seconds. The new search tests cover explicit submission, source navigation, stale/unconfigured availability, backend-driven progress and visible failures. Production TypeScript/Vite build passed: **392.71 kB JS / 118.34 kB gzip**, **49.77 kB CSS / 11.50 kB gzip**.
- Actual local E5 inference ranked the intended receipt passage first for two authored English/Urdu queries among three fictional excerpts. The final check took **3.381 seconds including model loading and both queries**; this is a technical fixture, not measured multilingual retrieval accuracy.
- Actual sherpa-onnx inference on four authored Windows speech blocks (David/Zira, **30.410 seconds** including gaps) produced **two anonymous clusters and nine estimated turns in 5.268 seconds**. One-voice synthetic speech also ran successfully. Block boundaries are not independent speech annotations; **no real-domain DER or speaker accuracy is claimed**.
- The complete actual-model media pipeline processed the 5.3-second public-image/synthetic-speech fixture in **44.361 seconds**, persisted two transcript segments and three events including speaker turns, deleted the original, enforced privacy-preview access, and built a ready encrypted search index. Five retrieved excerpts matched stored source text/offsets exactly; risk, version and decision status were unchanged. Analysis correctly remains partial because unsupported modalities are disclosed. This is not an operational latency benchmark.
- A separate live browser check used the actual installed E5 model on authored case `SA-26-1042`: five exact excerpts, timestamp seeking, index persistence after reload, unchanged decisions, **zero desktop/mobile axe violations**, no overflow and no page errors. It made no cloud request. Screenshots were visually inspected. The broader check found duplicate unlabeled sidebar landmarks; distinct workspace-navigation and case-review labels fixed them. The initial dropdown assertion was also corrected to inspect the native option's disabled property.
- **12 browser tests passed in the final full run (2.6 minutes)**, with no failed, skipped or retried tests. This includes keyword-search/source seeking through the real backend, search desktop/mobile accessibility, the existing broader WCAG audit, reviews, alerts, privacy processing, account boundaries, capture and the existing simulated transfer regression. Physical phone integration was not resumed. Two earlier runs each had 11 passes and one search-test failure (first the option assertion, then the duplicate landmarks); both were addressed before this final run.

Reproduction: [LOCAL_LANGUAGE_FEATURES.md](LOCAL_LANGUAGE_FEATURES.md). Actual local artifacts: `.local/ai-verification/language-verification.json`, `pipeline-verification.json`, `search-browser-verification.json`; search screenshots in `.impeccable/review/screenshots/`. Software tests and synthetic fixtures do not replace independent local-domain annotation, privacy evaluation or deployment testing. Mobile integration remains on hold.

## OpenRouter reading guide — 1 November 2026

- **230 backend tests passed in 54.31 seconds**, including 32 reading-guide cases covering access/CSRF, explicit consent, synthetic-source filtering, bounded packets, free-only routing, NVIDIA real-data prohibition even with opt-in, strict generated-field/reference validation, caching, cooldown/daily limits, failure persistence, concurrent requests, stale case versions, retention during generation and audit integrity. The warning comes from a deliberately duplicated ZIP member in the existing archive-rejection test. Pytest also reports an installed plugin's future loop-scope default; it did not fail tests.
- **18 frontend tests passed** in the final run, including manual preview, consent gating, changed-case handling, provider failure and source navigation.
- Production build passed: **386.21 kB JS / 116.64 kB gzip**, **49.25 kB CSS / 11.41 kB gzip**. TypeScript validation passed.
- **11 browser tests passed**, zero skipped/failed/retried cases. This includes the existing 17-state accessibility check and the new desktop/mobile transfer-preview test. The cloud response in that regression is an explicitly mocked fixture; its initial unconfigured state uses the real backend. The suite excludes cloud keys. Total runner time was **7.2 minutes**, including Windows cleanup delay; all test cases had completed before the temporary port-8010 server needed targeted termination. An earlier run could not launch the expected Chromium revision; the successful run used installed Chromium 1223 through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- **Actual free-provider connection:** the final production adapter sent two fixed fictional English excerpts and received a valid NVIDIA response in **4.235 seconds**. Default model: `nvidia/nemotron-3.5-lightning:free`. The earlier Gemma request used an unsupported strict-schema parameter (corrected to JSON-object mode), then both Gemma free endpoints returned upstream capacity limits. No paid fallback was attempted.
- **Actual full workflow:** the running app on port 8000 previewed five authored synthetic excerpts from `SA-26-1042`, obtained explicit transfer confirmation through the UI, received five valid selections from NVIDIA in **2.5 seconds**, persisted them and reloaded them successfully. Source seeking passed; case version/status/risk/reviews were unchanged. No real recording, personal information or reviewer note was sent. These timings describe individual requests, not steady-state performance or language-quality metrics.
- The live walkthrough found a frame-button accessible-name mismatch and an unlabeled environment banner. Both were fixed. The final live result check reported **zero axe violations**, no page errors and no horizontal overflow; the earlier live desktop/mobile transfer dialogs also had zero axe violations. Screenshots of mocked and actual-provider states were visually inspected. These automated checks are not a complete accessibility certification.

The current local app was started with `start.ps1`, loading the user-bound encrypted key. The real-provider script logs out its temporary session. Successful local artifacts: `.local/openrouter-verification.json`, `.local/openrouter-workflow-verification.json`; screenshots under `.impeccable/review/screenshots/reading-guide-*.png`. Reproduction and privacy limits: [OPENROUTER.md](OPENROUTER.md). A real-case cloud transfer was **not** run; the default NVIDIA adapter blocks it. Mobile device integration remains on hold.

## Optional language-model exploration — 1 November 2026

Before the OpenRouter implementation above, the full backend suite passed after adding seven synthetic-only local-language-model probe tests: **198 tests passed**, no failed/skipped cases. These tests check quotation/source validation, schema constraints, rejected tool requests/truncation, timeout reporting, output preservation and model-unload requests. They do **not** exercise actual Ollama inference. The requested Qwen weight files downloaded and passed all registry hashes; the user then redirected work toward hosted free models. The remaining Ollama runtime download was stopped before installation/inference. See [the precise experiment status](OLLAMA_EVALUATION.md).

## Current local AI and operations milestone — 1 November 2026

These checks ran on Windows, Python 3.11, the project-local runtime, CPU Torch 2.14 / Torchvision 0.29, MediaPipe **0.10.21**, OpenCV **4.11**, NumPy **1.26.4**, faster-whisper **1.2.1**, Node 24 and installed Chromium 1223. The host has approximately **7.85 GiB RAM**. This is functional verification, not a policing-model accuracy study or security certification.

- **191 backend tests passed in 44.03 seconds**, no skips/failures in that full run. New coverage includes Urdu-script/context/negation rules, low-likelihood ASR handling, hand/pose geometry, object/audio candidate safeguards, restricted face preview/release/revocation, configured-model failure recovery, audio bounded to video duration, scheduled retention/holds, encrypted backup/restore/session revocation, notification state/idempotency/demo protection, and evaluation source/metric validation.
- **14 frontend tests passed**, including confirmation snapshots during background refresh, conflict errors and provenance display without invented modality counts.
- Production TypeScript/Vite build passed: **380.10 kB JS / 114.91 kB gzip**, **48.24 kB CSS / 11.24 kB gzip**.
- **10 browser tests passed in 2.1 minutes** in the final run, with no skipped, failed or retried tests. They include the existing 17-state axe audit, case review, alerts, upload/capture, account boundaries and newly added retention-schedule persistence while scheduling remains off. The existing simulated two-client transfer regression was preserved; physical phone integration remains on hold.
- A separate browser check used the **actual model-processed fixture**, with no mocked application API. It verified decoded playback, participant denial before privacy confirmation, access after approval, denial after revocation, desktop/mobile layout and three additional axe states with **zero reported violations**. It reported no page errors or horizontal overflow. Desktop/mobile investigation and retention screenshots were inspected. These are automated checks, not a complete accessibility certification.
- The normal local application started through `start.ps1`. An authenticated health request confirmed a running worker and configured speech, fight, hand/pose, face, object and sound models. External notifications reported `disabled_in_demo`; the test session was logged out.

### Actual inference and evaluation plumbing

`backend.verify_ai` executed the pinned runtime on official MediaPipe hand/pose/face fixtures and locally synthesized English speech. It detected a thumb-up hand shape, pose landmarks and face boxes, and produced two timestamped speech segments matching the known generated sentence. YAMNet analyzed synthetic speech without reporting scream/shattering candidates. These are technical smoke checks; **no positive knife/scissors or scream/shattering recognition benchmark has been performed**.

`backend.verify_pipeline` submitted a 5.3-second video combining public model-test stills with generated English speech to an isolated backend. Real Whisper, imported R3D-18, hand/pose, object, face and YAMNet inference all completed. It stored two transcript segments, one neutral hand observation, six audio-analysis windows, protected derived media and component provenance. The case remained **partial / Unassessed**, rather than being cleared by missing models. Original deletion, restricted participant access and audit integrity passed. Elapsed processing was **51.7 seconds** in this particular CPU run, with other checks running on the host. This is not a steady-state throughput measurement or proof of the PRD's 60-second-video latency target.

The evaluation CLI also ran its complete isolated pipeline on one public/synthetic fixture and scored the known 12-word English reference: zero word/character errors for that fixture. Review-priority metrics were null because no reference routing label was supplied, and the 50-clip count flag remained false. This validates the harness, **not English, Urdu or Punjabi recognition quality**. It ran before the final YAMNet addition; the later all-model pipeline check above covers YAMNet persistence.

Reproduction: [local model checks](LOCAL_AI.md), [evaluation procedure](EVALUATION.md), [backup/retention/webhook operations](OPERATIONS.md). Ignored local artifacts are in `.local/ai-verification/{verification,pipeline-verification,browser-verification,synthetic-evaluation-results}.json`; they contain public/generated fixture results, not user operational evidence.

### Issues found and corrected

The initial MediaPipe 0.10.35 runtime attempted vendor usage telemetry during public-fixture verification. It was replaced with the pinned 0.10.21 runtime; incompatible versions fail before import and are shown as unavailable in health. See [runtime privacy limits](LOCAL_AI.md#runtime-privacy-and-compatibility). No user footage was used in those tests. The final inference checks used 0.10.21. This is not a proof that every third-party dependency is free of network behavior.

Verification also found and corrected a Windows backup file-handle issue, a test-account setup issue when demo mode was disabled, the test browser simulator's missing native-dialog API, a stale privacy-confirmation race, low-contrast excerpt timestamps, a stray numeric zero on real cases, and short-viewport/sidebar and checkbox layout problems. Browser checks then passed. Audio extraction now stops at the validated video duration; regression recordings with longer audio tracks exercise both transcription and sound-analysis paths.

The shared-system Python environment exposes an inherited OpenCV distribution's NumPy dependency warning; the project imports the verified local contrib build. Fresh-install instructions use a clean environment. Remaining diagnostic warnings include pytest-asyncio's unrelated fixture-scope notice, the intentional duplicate-ZIP-member attack fixture, MediaPipe's disabled feedback-tensor warnings and Chromium's color-output notice. No failed check is counted as passed.

Still unverified: local-domain model quality, a collected/annotated 50-recording set, positive-event object/acoustic benchmarks, broad privacy recall, real provider delivery, production hosting/load/security certification and physical phones. Mobile work remains on hold.

## Historical checks — October 30

The sections below record earlier runs and earlier capability availability. They are not the current model-installation status. Those tests ran on Windows with Python 3.11, Node 24.21, FastAPI 0.115, Pydantic 2.9.2, cryptography 48, loaded OpenCV 4.13 and bundled FFmpeg 7.1. Browser automation used Chromium 1223.

## Trained import and recoverable transfers — latest October 30 run

- **149 backend tests passed in 38.18 seconds**; no skipped/failed tests in the final run. Added archive/provenance checks, encrypted resumable transfers, server restart recovery, duplicate parts, concurrent finalization, role/owner/CSRF boundaries, checksum rejection, quota, expiry/discard and supplementary-case revalidation.
- **12 frontend tests passed** (nine existing component tests plus three background-refresh tests). Polling avoids overlap, pauses in hidden tabs, rejects stale responses and retains last-successful data on errors.
- **10 browser tests passed in 2.0 minutes**, including the 17-state accessibility audit, existing camera/review/admin journeys and a new two-session interrupted-upload journey. The latter drops both a part acknowledgement and the final completion acknowledgement, verifies no repeated first part or duplicate case, and observes automatic desktop queue updates. These are Chromium/emulated-phone checks, not a physical device test.
- Production build passed: **370.67 kB JS / 112.22 kB gzip**, **46.54 kB CSS / 10.91 kB gzip**.
- The actual user-trained bundle passed checksum, strict R3D-18 tensor load and finite forward inference. All saved holdout predictions reproduce the manifest metrics. An isolated application case using the trained model completed resumable submission, inference, persisted timing/score provenance and three privacy artifacts. See [model evaluation](MODEL_EVALUATION.md) for scope and measured results.
- Rendered mobile paused-upload and desktop updated-queue screenshots were inspected; the browser check confirmed no horizontal overflow at 390px. The design detector emitted advisory findings about existing palette/type documentation; these were not treated as newly verified accessibility defects or as grounds for an unrelated redesign.

Intermediate checks exposed an out-of-date generated notebook after a source edit, a tiny-fixture development split selecting only one group, test fixtures leaving jobs in a shared queue, and a five-second browser assertion too short for a 15 MB transfer. The notebook was regenerated, the development minimum corrected to two groups, fixture jobs isolated, and the browser test given a bounded realistic wait and smaller multi-part fixture. Final suites above passed. The expected malicious-archive fixture produces one duplicate-ZIP-member warning; pytest's existing async-scope deprecation warning remains diagnostic noise.

The user's Kaggle training is complete for this visual baseline. Physical phone/certificate testing, independent replay on source footage, near-duplicate/session review, local-domain validation and other ML modalities remain outstanding. Earlier sections below record historical results, not the current installed-model status.

## Kaggle duplicate recovery — October 30 follow-up

The user's Kaggle run stopped during inventory because two training files had identical SHA-256 content. Preparation now creates a linked view with one representative per same-label, same-original-split duplicate and records every exclusion. Source files are preserved; conflicting labels, group provenance and train/holdout overlap still fail closed. The inventory's strict duplicate check remains enabled.

- Executed `python -m pytest -o addopts='' -q tests/test_training_curation.py tests/test_model_bridge.py`: **28 passed in 16.05 seconds**, no skips or failures. This covers deterministic curation, both source splits, unchanged source content, label/group/leakage rejection, protected destinations, recovery-cell reruns, generated notebook/source synchronization, and the existing model bridge checks.
- Ran curation followed by an actual one-batch CPU R3D-18 training/evaluation/export on generated clips with an added exact duplicate: **13 source files, 12 retained, 1 exclusion**. Checked that the export ZIP contains the report and its manifest checksum matches. The serving loader rejected the resulting `test_only` bundle as expected. These synthetic outputs do not measure detector quality.
- Generated a standalone recovery cell for the user's already running notebook. It preserves the exclusion report alongside the older trainer's ZIP; newly imported notebooks include it inside the ZIP automatically.

The actual Kaggle dataset has not been curated or trained in this local workspace. The recovery cell still needs to run in the user's Kaggle session. Frontend/browser suites were not rerun for this training-only change; their preceding results remain below.

## Model bridge and mobile preparation — October 30 follow-up

- Full backend suite: **113 passed in 26.35 seconds**, no skips/failures.
- Frontend component suite: **9 passed** after the capture changes.
- Final complete browser regression: **9 passed in 1.8 minutes**, including the moving-camera recording/upload test and the 17-state accessibility audit. No tests were skipped; earlier capture failures were fixed and the entire suite rerun.
- Production TypeScript/Vite build: **passed**, 367.58 kB JS / 111.17 kB gzip; CSS 46.23 kB / 10.84 kB gzip.
- Actual CPU R3D-18 training step, development/test prediction and export ran on generated random-color clips. The resulting bundle is `test_only`; its attempted server import was rejected as expected. These are plumbing checks, **not detector-quality measurements**.
- Strict tensor-weight load, checksum/architecture checks, real R3D-18 forward pass, shared preprocessing, deterministic splits, duplicate/group-leakage rejection, source-collection selection, threshold logic, notebook syntax and embedded-source synchronization passed. Fixtures do not represent real trained predictions.
- Pipeline tests persist model-labeled events with supporting artifact IDs, version/hash provenance and local Ambiguous review alerts. Invalid configured models fail visibly and retain the source for retry. Negative model results do not clear unsupported modalities.
- Mobile tests establish certificate generation, a real loopback TLS handshake with explicit CA verification, and two independent password-authenticated API clients sharing an uploaded case and review state. The latter are in-process HTTPS-configured test clients, not a physical phone/network test. No OS trust store or firewall was changed.

The follow-up browser runs exposed two capture problems: the installed Chromium's default synthetic camera supplied audio-only or single-frame recordings, and duration-less browser WebM metadata was rejected. Uploaded files now use the explicit FFmpeg backend with open/read timeouts, preventing the audio-only Windows decoder fallback stall. Browser timing is normalized before validation; bounded normalization still rejects over-length recordings. The UI waits for a usable preview and prefers supported WebM recording. The browser test now uses an explicit moving Y4M test-pattern camera and verifies multiple decoded preview frames. Its focused upload/processing test passed in **22.4 seconds** after the fixes. Earlier failed runs remain disclosed; they were not counted as passes.

Still unexecuted: full Kaggle GPU training on authorized RWF footage, RLVS curation/evaluation, XD-Violence training, real-domain model evaluation, real speech inference, physical phone Wi-Fi/camera use and certificate installation on user devices. Dataset links were provided; their actual video files were not downloaded here. The additional Kaggle collection's public metadata and partial inventory were inspected; it contains RWF-2000, so the notebook selects a subset instead of duplicating sources. Its reported license is Unknown.

## Earlier application verification

| Check actually executed | Result |
| --- | --- |
| `python -m pytest -o addopts='' -q` | **86 passed**, 7.39 seconds; no skipped or failed tests. |
| `npm.cmd test` | **9 passed**, one component-test file. |
| `npm.cmd run build` | **Passed** TypeScript and production build; final bundle approximately 367.23 kB JS / 111.04 kB gzip and 46.23 kB CSS / 10.84 kB gzip. |
| `npm.cmd run test:e2e` | **9 passed**, 74.18 seconds, zero skipped/unexpected/flaky results in the final complete run. |
| Automated accessibility, included in browser suite | **Zero reported violations** for the selected WCAG A/AA tags across 17 page/tab/view states. |
| `python -m backend.manage verify-audit` | **Valid**, all 22 entries in the local demonstration ledger at the time checked. |
| `python -m backend.manage --help` | **Passed**, operator commands are available. |
| Final targeted responsive/media capture check | **1 passed**, 21.5 seconds after strengthening the decoded-frame wait; application source unchanged. |
| Independent visual verdict | **Ship** for the four reviewed views; all three original material findings resolved. |

## What the tests establish

Backend tests exercise authentication requirements, all non-admin role boundaries for admin endpoints, ownership and alert scope, protected media and exports, CSRF/origin rejection, password verification and throttling, session revocation, review rationales, stale versions, independent appeals, invalid assignees, notes, escalation and alert lifecycle, file signature/consent checks, deduplication, byte ranges, encrypted storage, corrupted-media failure, policy history, audit triggers/hash verification, retention holds/deletion, device registry and phrase administration.

An actual generated video is processed through upload, decoding, redaction, artifact storage and protected retrieval. The test decodes the resulting frame and checks that high-frequency image detail is suppressed, verifies original deletion and checks unavailable transcription/Unassessed state. This is a redaction-pipeline regression test, not a comprehensive face-anonymization evaluation.

Risk tests cover 15 routine text examples and nine context-sensitive phrases, missing evidence, gesture-only uncertainty, aligned versus separated signals, strict eight-second windows, explicit safety overrides, source-reference preservation, null model confidence and disabled rules. These supplied texts/signals do not validate real audio or visual recognition.

Frontend component tests cover semantic risk labels, evidence/source links, pagination boundaries, empty/error/retry behavior and actionable validation text. Browser journeys cover:

1. Dashboard, search/filter persistence, transcript seeking, keyboard evidence tabs, desktop/mobile screenshots and no root overflow at 390px.
2. Persisted investigation notes, required rationale, confirmation and review history.
3. Citizen case/admin restrictions, protected export and independent appeal request.
4. Actual MP4 upload, processing, protected blurred artifacts and duplicate submission.
5. Additional-evidence request and linked upload without replacing the original case history.
6. Local alert acknowledgement and resolution, persisted response history and unavailable external delivery.
7. Administrator account creation, policy inspection and audit integrity view.
8. Browser camera consent controls, recording/stop, actual upload and redaction. Chromium's **synthetic camera and microphone** were used; no real device or person was recorded.
9. Axe audit of sign-in, dashboard, queue, capture, investigation, alerts, administration, health, four admin subsections, audit, three evidence tabs and mobile investigation.

## Visual evidence

The browser test saves desktop overview/investigation at 1440px and mobile overview/investigation at 390px in `.impeccable/review/screenshots/`. Screenshots are local ignored review artifacts. The final capture check waits for actual decoded playback before pausing; setting a media timestamp alone is not proof that a frame has finished loading. Independent review assessed the original three findings: text contrast, provenance control size and capture validity. A replacement reviewer completed the interrupted final handoff, requested a settled desktop media capture, then returned **Ship** with all three findings resolved. Its scope does not establish backend correctness or blanket accessibility compliance. The source-grounded design documentation was separately verified in `DESIGN.md` and `.impeccable/design.json`.

## Defects encountered and corrected

- Mobile document overflow from an offscreen accessibility label inside the case table was contained. Hidden mobile navigation is no longer keyboard-focusable when closed.
- Automated checks found low-contrast table/header/tab/metadata/status/source text. The identified selectors were corrected and the expanded audit passed.
- Review confirmation now holds the version seen when the dialog opens. New supplementary evidence invalidates stale decisions.
- Temporal fusion no longer accidentally joins a sixteen-second span through an eight-second midpoint. Safety overrides retain the safety evidence references.
- Processing failures record the failed stage; retry replacement preserves alert relationships. Corrupted encrypted artifacts fail closed with an actionable error.
- Browser-test setup originally navigated before sign-in completed and selected a response control after the workspace closed. The tests now wait for the signed-in screen and reopen the persisted alert record. The final complete suite passed.
- Default Playwright Chromium revision 1248 was absent. The run explicitly selected installed revision 1223; no browser-install success was fabricated.

## Limitations and non-blocking diagnostics

The environment's pytest-asyncio plugin emitted a future-fixture-scope deprecation warning; these tests are synchronous. One passing browser run logged Windows `ConnectionResetError` during a browser connection close. This remains disclosed diagnostic noise, not a suppressed error or an asserted production reliability result. The deliberately malformed MP4 test produces a decoder warning as expected.

Not executed: real Whisper inference, real-data trained gesture/pose/weapon/violence/tone evaluation, a labeled 50-scenario field dataset, load/stress benchmarking, device hardware integration, external notification delivery, deployed phone TLS/volume-encryption verification, external penetration testing, screen-reader user testing or a full cross-browser/device certification matrix. The later local TLS handshake and synthetic model bridge tests are described above. No accuracy, precision, recall, F1, calibration or operational response-time claim follows from these application tests.

For reproduction, follow [README](../README.md#verification). Tests create isolated data directories and do not reset the main demonstration database. The browser report is written to `test-results/e2e-results.json`; later targeted runs overwrite that report, so retain copies when comparing runs.
