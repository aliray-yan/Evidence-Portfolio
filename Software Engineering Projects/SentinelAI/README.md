# SentinelAI

An evidence-centered, locally runnable FYP application for police-interaction review and safety exercises. React + TypeScript, FastAPI, SQLite, FFmpeg/OpenCV, and encrypted media storage.

Start with [the complete project and AI-agent handover](<project info documentation.md>) for the requirements, file catalog, downloaded assets, experiments, current training, verified results and remaining work.

**13 November update:** [learned exchange integration and measured results](docs/LEARNED_EXCHANGE_INTEGRATION.md). The trained native DINOv2/GRU model is selected after three CPU runs passed (p95 147.67/147.30/141.61ms). Actual learned-model upload passed. Backend:384 tests; frontend:31 tests; production build passed. The combined live-model test is documented separately. No training job is running; these software checks do not establish field accuracy.

**Current scope — 11 November 2026:** new analysis is vision-only. Speech-to-text, Whisper, sound/speaker analysis, phrase matching, conversation analysis and audio/video fusion have been removed from application processing. Capture does not request a microphone. Historical transcripts and decisions remain available as archived evidence.

**This is a working local application, not a validated policing AI.** Persistent upload, review, role enforcement, audit, privacy and continuous MediaMTX streaming workflows are implemented. The supplied RWF fight model remains active. The learned exchange model detected the known cash/envelope controls; it replaces the selected geometric baseline, which missed them. This is possible object-transfer classification, with no currency, intent, guilt or action-box claim. See [vision-only implementation, attributed videos and measured limitations](docs/VISION_ONLY.md).

Android file upload and short camera submission were verified previously. Physical continuous WebRTC and interrupted-Wi-Fi tests remain outstanding. See [live streaming](docs/LIVE_STREAMING.md), [Android setup](docs/ANDROID_QUICK_TEST.md), and [implementation status](STATUS.md). Weights and evaluation videos remain in ignored local storage; fresh clones require explicit setup.

Local evidence search and the optional reviewer-triggered [OpenRouter reading guide](docs/OPENROUTER.md) operate on existing evidence. The guide selects source excerpts and predefined checks, does not create factual claims or case decisions, and does not run bribery classification. Old English speech results are historical and do not measure the current visual module. The [Qwen/Ollama experiment](docs/OLLAMA_EVALUATION.md) is not active inference.

Custom visual-transfer models have now been trained locally on attributed SBU,
Cornell and CAP data, with UT-Interaction added for further false-alert training.
The first three learned models failed detection screening. The fourth,
DINOv2/GRU, completed training and passed the detection checks on 11 November,
including the handshake control. Its original execution failed the CPU limit;
bounded native decoding now passes all three timing runs and is selected for
local FYP review. Converted FP32/INT8 candidates remain unselected.
`watch-training.cmd` records the original pre-optimization job result;
the current installation is documented in the13November integration note.
See [measured results and failed checks](docs/EXCHANGE_MODEL_EVALUATION.md) and
[reproduction instructions](training/EXCHANGE.md). Do not interpret a learned
transfer score as proof that money changed hands or bribery occurred.

## Quick start (Windows / PowerShell)

On this already configured workstation, run `powershell -ExecutionPolicy Bypass -File .\start.ps1` from the SentinelAI directory and open [SentinelAI](http://127.0.0.1:8000). The launcher uses the installed local AI runtime. Stop an older server first if port 8000 is in use.

For a fresh clone, use Python **3.11** and Node 20.19+:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd ci
npm.cmd run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open [SentinelAI](http://127.0.0.1:8000). The API serves the built frontend and protected media from the same origin. Keep one server worker. If using an already configured Python environment, replace `.\.venv\Scripts\python.exe` with `python`.

The base install supports workflow demonstrations and media processing. For real inference, install `requirements-vision.txt` and `requirements-ai.txt` into that same environment and follow [local AI setup](docs/LOCAL_AI.md). Do not start a different Python environment that lacks the selected models' dependencies.

On macOS/Linux use `python3`, `.venv/bin/python`, and `npm` instead. The build is platform independent; this implementation was verified on Windows.

The first startup applies versioned SQL migrations, initializes the phrase library, creates a local media key in `.local/data/media.key`, and seeds ten explicitly archived synthetic scenarios when demo mode is enabled. Initialization is repeatable and does not reset reviews. Startup generates a 24-second silent title-card fixture. It is **not footage of the scripted events**.

For frontend development, run the API above plus `npm.cmd run dev`; open [Vite development server](http://127.0.0.1:5173). API traffic is proxied to port 8000.

## Demonstration roles

Select **Local demonstration** on the sign-in page. No password is required for these intentionally local demo personas:

| Persona | Capabilities |
| --- | --- |
| Ayesha / supervisor | Inspect all cases, review, assign, escalate, manage alerts |
| Bilal / second supervisor | Independent appeal decisions |
| Citizen | Own submissions, evidence, notes, exports, and appeals |
| Officer | Own submissions, evidence, notes, exports, and appeals |
| Control room | Cases associated with alerts; acknowledgement, assignment and resolution |
| Administrator | All reviewer capabilities plus users, policies, registry, audit and retention |

All persona names and records are fictional. Demo login is limited to loopback clients, and the documented server binds to loopback. **Do not expose or reverse-proxy demo mode to remote users.** A local reverse proxy can make remote traffic appear to originate from loopback. Set `SENTINEL_DEMO=0` before any remote deployment. Demo accounts are fixed and cannot be repurposed as real accounts.

Suggested demonstration:

1. Enter as supervisor. Inspect archived synthetic cases to exercise review workflows. These authored historical annotations are not current model output.
2. Open a case. Click transcript/event timestamps; inspect the synthetic title-card playback, source references, risk contributions and missing evidence.
3. Add a note, dismiss or confirm a concern with a rationale, or escalate it to the local alert center.
4. Sign in as the owning citizen/officer and contest a completed decision. The original reviewer cannot decide their own appeal; use the second supervisor.
5. Enter as control room. Acknowledge, assign and resolve an alert. External delivery remains explicitly unavailable.
6. Upload an authorized MP4/WebM, no more than 100 MB, 120 seconds, 3840×2160, or 120 fps. Inspect stage records, model provenance and protected artifacts. Missing capabilities keep analysis partial; no concerning output is not a safety clearance. As a supervisor, inspect the masked privacy preview before any release.
7. Enter as administrator. Create a local account, register a device, inspect policy versions and audit integrity, or preview retention candidates.

## Import a trusted trained model

```powershell
python -m pip install -r requirements-vision.txt
python -m backend.model_import "$env:USERPROFILE\Downloads\sentinel-rwf-r3d18-v1.zip" --activate
```

The importer validates the archive, checksums, recorded split, reproduced test metrics and actual tensor inference, then installs under `.local/models/` and writes `.local/model-selection.json`. Restart the normal or mobile backend to use the selection. An explicit `SENTINEL_VIOLENCE_MODEL` overrides it; set that variable to an empty string to disable inference. Configuration changes are audited on startup. Import only an export you trained or trust; checksums alone do not authenticate a model. See [the verified research results](docs/MODEL_EVALUATION.md).

## Real local accounts

An administrator can create accounts in the UI. There are no hardcoded real-account passwords. To bootstrap an administrator directly:

```powershell
python -m backend.manage create-admin --email reviewer@example.test --name "Local administrator"
```

The command prompts for a password without echoing it. The email is an account identifier; no email is sent. Passwords use salted scrypt. Sessions use random opaque tokens, server-side expiry, an HttpOnly SameSite=Strict cookie, CSRF verification, and origin checks. Role updates revoke existing sessions. Login failures are throttled by source/account key. Password reset, MFA, SSO, organization tenancy and email verification are not implemented.

## Environment configuration

`.env.example` documents values. **The app does not automatically read `.env`.** Set process environment variables or use your deployment secret manager.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SENTINEL_DATA_DIR` | `.local/data` under this project | SQLite, encrypted media and temporary processing directory |
| `SENTINEL_DEMO` | `1` | Seed synthetic fixtures and permit local demo login |
| `SENTINEL_TEST_VIDEOS` | `0` | Enable authenticated synthetic MP4 downloads outside demo mode; the temporary mobile helper enables this |
| `SENTINEL_TEST_UPLOADS` | `0` | Force all new submissions to test recordings; enabled for the isolated mobile instance |
| `SENTINEL_ENCRYPTION_KEY` | Generated local key in demo | Persistent Fernet key; required outside demo mode |
| `SENTINEL_SECURE_COOKIE` | `0` | Set `1` behind HTTPS; also enables HSTS response header |
| `SENTINEL_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated accepted hostnames |
| `SENTINEL_WORKERS` | `1` | Set `0` to disable the processing thread for tests/maintenance |
| `SENTINEL_WHISPER_MODEL`, `SENTINEL_ACOUSTIC_MODEL`, `SENTINEL_DIARIZATION_MODEL` | Disabled | Legacy values are ignored; new encounters never run audio analysis |
| `SENTINEL_VIOLENCE_MODEL` | Local selected bundle, otherwise empty | Verified R3D-18 bundle folder exported by the Kaggle notebook; requires optional `requirements-vision.txt` |
| `SENTINEL_GESTURE_MODEL`, `SENTINEL_POSE_MODEL`, `SENTINEL_FACE_MODEL` | Local selected models, otherwise empty | Local MediaPipe task/detector files; pinned runtime required |
| `SENTINEL_OBJECT_MODEL` | Local selected model, otherwise empty | Local Torchvision SSDLite COCO weights; limited knife/scissors candidates |
| `SENTINEL_LEARNED_EXCHANGE_MODEL` | Explicit local selection, otherwise empty | Screened learned installation; invalid files fail clearly. Empty environment override disables it for that process |
| `SENTINEL_EXCHANGE_MODEL` | Local selected model, otherwise empty | Optional geometric baseline when no learned detector is selected |
| `SENTINEL_RETRIEVAL_MODEL` | Local selected model, otherwise empty | Local multilingual E5 search of existing evidence, not new speech analysis |
| `SENTINEL_STREAMING` | `1` | Allow the configured private MediaMTX service; binaries/dependencies must be installed separately |
| `SENTINEL_NOTIFICATION_URL`, `SENTINEL_NOTIFICATION_SECRET` | empty | HTTPS webhook and ≥32-character signing secret; manual sending only, disabled in demo |

Generate a Fernet key using `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`, then place it in your secret manager or process environment. Never commit it. Existing media and audit integrity depend on the original key; replacing it does not rotate existing records. Back up the key securely alongside an encrypted backup of the database and media.

## Implemented media and analysis pipeline

1. Resumable browser upload (or legacy multipart API): consent, bounded size, encrypted parts, checksum/container checks, owner/content deduplication and an encrypted original. Interrupted transfers can resume; cases begin only after complete verification.
2. Persistent SQLite job: atomic claim, actual OpenCV decode/duration/resolution validation. Browser recordings without usable duration metadata are normalized to a bounded 30fps H.264 timeline in temporary storage; audio-only files are rejected without falling back to Windows camera/device decoders.
3. Visual exchange analysis: verified person detection, hand landmarks, unidentified rectangular-region proposals and consecutive-frame transfer rules. Model absence is shown; configured failures remain retryable.
4. Configured fight, hand/pose, knife/scissors and privacy models analyze video. FFmpeg creates silent, blurred video/frame/excerpt evidence; selective face masking requires separate review. Persisted media is encrypted.
5. Timestamped event persistence: available source frames, snapshots and excerpts link to the event. Preserved live findings retain their original timing/provenance even if replay reanalysis differs.
6. Versioned visual review priority: a flagged visual exchange or safety candidate requests Ambiguous human review; a missing or below-threshold result does not clear the case. There is no audio or multimodal risk fusion.
7. Deterministic summary: enumerates persisted artifacts, interpretation references, uncertainty, missing evidence, and human conclusions.
8. Successful processing deletes the encrypted original and leaves the case ready for human review with **partial analysis**. Failures retain a quarantined source for retry until retention is run.

The queue survives restart; interrupted running jobs are returned to the queue. This is a single-process worker architecture, not a distributed job service. The UI uses real upload bytes and persisted backend stage updates, not simulated progress timers.

See [local AI setup](docs/LOCAL_AI.md) and [current vision-only verification](docs/VISION_ONLY.md). Actual installed-model processing was exercised with an attributed stock video, no transcript, four protected artifacts and a verified audit chain. This proves integration, not detection accuracy.

## Privacy and deployment boundaries

- Media access always passes server authentication, role/ownership scope, privacy status and an audit write. There are no public media URLs or original-download routes.
- Entire-frame blur is the default. A separately encrypted face-masked copy stays restricted to supervisors/admins until an audited, version-checked privacy release; release can be revoked. Detectors can miss people and other identifiers. Audio is removed from review video. Historical transcripts remain sensitive and role restricted.
- Fernet provides authenticated encryption for persisted media. SQLite metadata, transcripts, the local demo key, upload spool files and temporary processing files are **not application-encrypted**. Use an encrypted, access-restricted host volume, protected backups and a secret manager for non-demo work.
- The default command serves local HTTP; the temporary mobile helper provides private-LAN HTTPS. For a deployed service use the example [Caddy configuration](deploy/Caddyfile.example), configure your hostname, disable demo mode, and enable secure cookies. The reverse-proxy template is supplied but not deployed or verified here.
- Source originals are deleted after processing. General original preservation remains unavailable. Consented live clear replay and explicitly preserved live snapshots/provenance have a separate, audited reviewer-only access boundary.
- Retention supports reviewed manual deletion and an explicitly enabled schedule, **off by default**. Legal holds exclude cases. Scheduling runs between jobs while the worker is available; it does not guarantee a wall-clock deletion deadline. Minimal tombstones/audit remain. [Operations](docs/OPERATIONS.md) documents retention and the tested encrypted backup/restore CLI; secure erasure from SSDs/backups is not guaranteed.
- Audit records reject UPDATE/DELETE via triggers and have a keyed hash chain. They are append-only through the app and tamper-evident, **not immutable against host/database administrators**. Use external WORM storage before claiming infrastructure immutability.
- Device registration is an inventory, not a paired-camera authentication system.
- An optional signed webhook requires configuration and a manual responder action outside demo mode. HTTP acceptance is distinct from recipient delivery. No SMS/push account or emergency dispatch service is configured; demos cannot send external incident notifications. [Connector contract](docs/OPERATIONS.md#optional-external-webhook).

See [security boundaries](docs/SECURITY.md) and [implementation status](STATUS.md).

## Reports

When a reviewer requests additional evidence, open **Submit requested evidence** on the case. The new recording is linked to the original investigation and keeps its own processing record. The original decision history remains intact; receiving a recording does not automatically complete the request. Reviewers should inspect all linked sources before deciding.

Authorized users may export their accessible case as structured JSON or self-contained printable HTML. Open the HTML and use the browser's Print command to save a PDF. Exports contain evidence hashes/IDs, timestamps, scripted/model/rule provenance, uncertainty and review rationale. Exact coordinates and owner identifiers are omitted. Every export is audited; reports are not legally certified evidence.

## Verification

```powershell
.\.local\runtime\Scripts\python.exe -m pytest
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Tests run against temporary/isolated data directories, never the demonstration database. Browser tests start their own server on port 8010 and require a current build. If using an existing compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path. The recorded run used installed Chromium 1223. The test runner's default Chromium revision was absent; the initial browser launch attempt failed until an existing binary was explicitly selected.

[Verification report](docs/VERIFICATION.md) records actual executed results and repairs. [PRD coverage](docs/PRD_COVERAGE.md) distinguishes workflow tests, scripted indicators and unsupported perception requirements. No precision, recall, F1, or accuracy claims are made without a labeled evaluation dataset.

The [evaluation harness and 50-slot collection plan](docs/EVALUATION.md) are ready for authorized reference recordings. The slots are unrecorded; they do not satisfy the PRD's 50-video research requirement.

## Troubleshooting

| Symptom | Recovery |
| --- | --- |
| UI unavailable or API-only response | Run `npm.cmd run build`, then restart the API so it mounts `dist/`. |
| Missing dependencies | Install `requirements.txt` using the same Python executable that starts uvicorn. |
| Session verification failed | Refresh to obtain the session CSRF token, or sign out and back in. |
| Invalid host header | Add the intended hostname to `SENTINEL_ALLOWED_HOSTS`; do not use unrestricted wildcards. |
| MP4 fails decoding | Export H.264 MP4 under the limits. The pipeline records the failure and offers retry if the source remains. |
| Browser records WebM | Supported for browser capture; normalized to a redacted MP4 by the backend. |
| Camera denied | Use localhost or HTTPS and explicitly grant camera permission. Microphone access is not requested; upload is available without camera access. |
| Missing vision outputs | Read System health. Missing models do not become simulated predictions on real uploads. |
| FFmpeg unavailable | Reinstall `imageio-ffmpeg`, which bundles FFmpeg on supported platforms. |
| Key lost or changed | Restore the correct key from your protected backup. Do not delete the key to “fix” encrypted files. |
| Jobs stuck after restart | Start a single worker-enabled server. Running jobs are reclaimed on startup. |
| Need a fresh demo | Choose a **new** `SENTINEL_DATA_DIR` and restart; this preserves existing records. |
| Frontend tooling denied by Windows sandbox | Run the build in an authorized normal terminal; do not change application access controls. |

## Project structure

```text
backend/             API, security, database, storage, jobs, rules and synthetic seeding
backend/migrations/  Ordered SQL migrations
src/                 React application, styles and component tests
tests/               Unit, API, role-boundary and real-media integration tests
e2e/                 Browser journeys and automated accessibility checks
docs/                Architecture, limitations, PRD coverage and verification
deploy/              Optional deployment configuration (not deployed)
.local/              Ignored local database, keys, media and test state
```
