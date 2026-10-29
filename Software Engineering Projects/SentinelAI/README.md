# SentinelAI

An evidence-centered, locally runnable FYP application for police-interaction review and safety exercises. React + TypeScript, FastAPI, SQLite, FFmpeg/OpenCV, and encrypted media storage.

**This is a working local application, not a validated policing AI.** Genuine media processing and persistent review workflows are implemented. Trained gesture, pose, violence, weapon, tone, and speaker-recognition models are not installed. Synthetic annotations are explicitly labeled. No external emergency service is contacted.

## Quick start (Windows / PowerShell)

Run from the SentinelAI directory. Python 3.11+ and Node 20.19+ are required.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd ci
npm.cmd run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open [SentinelAI](http://127.0.0.1:8000). The API serves the built frontend and protected media from the same origin. Keep one server worker. If using an already configured Python environment, replace `.\.venv\Scripts\python.exe` with `python`.

On macOS/Linux use `python3`, `.venv/bin/python`, and `npm` instead. The build is platform independent; this implementation was verified on Windows.

The first startup applies versioned SQL migrations, initializes the phrase library, creates a local media key in `.local/data/media.key`, and seeds ten synthetic scenarios when demo mode is enabled. Initialization is repeatable and does not reset reviews. Startup generates a 24-second silent title-card fixture. It is **not footage of the scripted events**.

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

1. Enter as supervisor. Compare routine challan, ambiguous FIR, gesture-only and contextual payment cases.
2. Open a case. Click transcript/event timestamps; inspect the synthetic title-card playback, source references, risk contributions and missing evidence.
3. Add a note, dismiss or confirm a concern with a rationale, or escalate it to the local alert center.
4. Sign in as the owning citizen/officer and contest a completed decision. The original reviewer cannot decide their own appeal; use the second supervisor.
5. Enter as control room. Acknowledge, assign and resolve an alert. External delivery remains explicitly unavailable.
6. Upload an authorized MP4/WebM, no more than 100 MB, 120 seconds, 3840×2160, or 120 fps. Inspect actual stage records and redacted video/frame/excerpt. Without speech weights, the result remains partial and Unassessed.
7. Enter as administrator. Create a local account, register a device, inspect policy versions and audit integrity, or preview retention candidates.

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
| `SENTINEL_ENCRYPTION_KEY` | Generated local key in demo | Persistent Fernet key; required outside demo mode |
| `SENTINEL_SECURE_COOKIE` | `0` | Set `1` behind HTTPS; also enables HSTS response header |
| `SENTINEL_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated accepted hostnames |
| `SENTINEL_WORKERS` | `1` | Set `0` to disable the processing thread for tests/maintenance |
| `SENTINEL_WHISPER_MODEL` | empty | Explicit local faster-whisper model directory; never downloaded automatically |

Generate a Fernet key using `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`, then place it in your secret manager or process environment. Never commit it. Existing media and audit integrity depend on the original key; replacing it does not rotate existing records. Back up the key securely alongside an encrypted backup of the database and media.

## Implemented media and analysis pipeline

1. Multipart upload: consent declaration, bounded file size, container signature checks, unique owner/content hash, encrypted original.
2. Persistent SQLite job: atomic claim, actual OpenCV decode/duration/resolution validation.
3. Optional local transcription: audio extraction to temporary PCM, CPU int8 faster-whisper, timestamped transcript; no diarization.
4. FFmpeg processing: scaled entire-frame blur, silent H.264 MP4, JPEG screenshot, first 12-second excerpt. All persisted artifacts are encrypted.
5. Phrase rules: Unicode normalization, configured phrases and context cautions, source-segment references. These are rules, not a trained semantic-intent model.
6. Temporal fusion: versioned heuristics described in [AI limitations](docs/AI_LIMITATIONS.md). Missing vision cannot clear an interaction.
7. Deterministic summary: enumerates persisted artifacts, interpretation references, uncertainty, missing evidence, and human conclusions.
8. Successful processing deletes the encrypted original and leaves the case ready for human review with **partial analysis**. Failures retain a quarantined source for retry until retention is run.

The queue survives restart; interrupted running jobs are returned to the queue. This is a single-process worker architecture, not a distributed job service. The UI uses real upload bytes and persisted backend stage updates, not simulated progress timers.

To enable optional ASR:

```powershell
python -m pip install faster-whisper
$env:SENTINEL_WHISPER_MODEL = 'C:\models\your-local-multilingual-whisper-model'
```

Acquire compatible model weights separately from an authorized source. Restart the API. System health will say **configured**, not verified; each job records success/failure. Urdu/Punjabi/code-switching quality must be evaluated on consented recordings. This environment had no ASR weights, so real ASR was not verified.

## Privacy and deployment boundaries

- Media access always passes server authentication, role/ownership scope, privacy status and an audit write. There are no public media URLs or original-download routes.
- Entire-frame blurring includes faces and avoids claiming perfect face detection. It sacrifices visual detail; it is not selective face-only anonymization. Audio is removed from review video. Transcripts may contain sensitive words and remain role restricted.
- Fernet provides authenticated encryption for persisted media. SQLite metadata, transcripts, the local demo key, upload spool files and temporary processing files are **not application-encrypted**. Use an encrypted, access-restricted host volume, protected backups and a secret manager for non-demo work.
- TLS is not provided by the Python server. Use the example [Caddy configuration](deploy/Caddyfile.example), configure your hostname, disable demo mode, and enable secure cookies. The reverse-proxy template is supplied but not deployed or verified here.
- Source originals are deleted after processing. Original preservation and an unblurred-access authorization workflow are intentionally unavailable in this build.
- Retention is a reviewed **manual administrator procedure**. Preview candidates, supply a rationale, then confirm deletion. Legal holds exclude cases. Failed-source quarantine expiry requires running this procedure; no scheduler silently guarantees timely deletion. Minimal tombstones and audit records remain. Physical secure erasure from SSDs/backups is not guaranteed.
- Audit records reject UPDATE/DELETE via triggers and have a keyed hash chain. They are append-only through the app and tamper-evident, **not immutable against host/database administrators**. Use external WORM storage before claiming infrastructure immutability.
- Device registration is an inventory, not a paired-camera authentication system.
- No SMS, push, emergency call, or external dispatch integration is installed. Local notification states accurately show `recorded` / `unavailable`.

See [security boundaries](docs/SECURITY.md) and [implementation status](STATUS.md).

## Reports

When a reviewer requests additional evidence, open **Submit requested evidence** on the case. The new recording is linked to the original investigation and keeps its own processing record. The original decision history remains intact; receiving a recording does not automatically complete the request. Reviewers should inspect all linked sources before deciding.

Authorized users may export their accessible case as structured JSON or self-contained printable HTML. Open the HTML and use the browser's Print command to save a PDF. Exports contain evidence hashes/IDs, timestamps, scripted/model/rule provenance, uncertainty and review rationale. Exact coordinates and owner identifiers are omitted. Every export is audited; reports are not legally certified evidence.

## Verification

```powershell
python -m pytest
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Tests run against temporary/isolated data directories, never the demonstration database. Browser tests start their own server on port 8010 and require a current build. If using an existing compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path. The recorded run used installed Chromium 1223. The test runner's default Chromium revision was absent; the initial browser launch attempt failed until an existing binary was explicitly selected.

[Verification report](docs/VERIFICATION.md) records actual executed results and repairs. [PRD coverage](docs/PRD_COVERAGE.md) distinguishes workflow tests, scripted indicators and unsupported perception requirements. No precision, recall, F1, or accuracy claims are made without a labeled evaluation dataset.

## Troubleshooting

| Symptom | Recovery |
| --- | --- |
| UI unavailable or API-only response | Run `npm.cmd run build`, then restart the API so it mounts `dist/`. |
| Missing dependencies | Install `requirements.txt` using the same Python executable that starts uvicorn. |
| Session verification failed | Refresh to obtain the session CSRF token, or sign out and back in. |
| Invalid host header | Add the intended hostname to `SENTINEL_ALLOWED_HOSTS`; do not use unrestricted wildcards. |
| MP4 fails decoding | Export H.264 MP4 under the limits. The pipeline records the failure and offers retry if the source remains. |
| Browser records WebM | Supported for browser capture; normalized to a redacted MP4 by the backend. |
| Camera/microphone denied | Use localhost or HTTPS and explicitly grant permission. Upload is available without camera access. |
| Missing speech/vision outputs | Read System health. Missing models do not become simulated predictions on real uploads. |
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
