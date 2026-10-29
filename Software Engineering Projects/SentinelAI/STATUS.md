# Implementation status

Verified local FYP implementation, October 29, 2026. This repository began empty. It now contains a persistent application and real media-processing workflow; it is **not a validated multimodal policing classifier or a production-certified deployment**.

## Delivered

| Requirement | Implemented behavior |
| --- | --- |
| Sign-in and roles | Password sign-in, separately labeled local demo personas, opaque expiring sessions, CSRF, role/scope enforcement on APIs and media, session revocation on access changes. |
| Operations | Persisted counts, risk distribution, seven-day trend, actual upload-processing average, failures, queue search/filter/sort/pagination and URL-preserved filters. No invented operating metrics. |
| Investigation | Protected video/range playback, timestamps, frames/excerpt, transcript/event/source links, explicit missing evidence, risk terms, human conclusions, history, notes and exports. |
| Upload and capture | MP4/WebM validation, consent, actual upload progress, optional authorized location, camera recording, durable processing jobs, recovery and content deduplication. |
| Review | Confirmation, dismissal, escalation, assignment, additional-evidence requests, linked supplementary recordings, rationale, optimistic version checks and participant appeals requiring a different deciding reviewer. |
| Alerts | Local persisted safety/review alerts, acknowledgement, assignment, escalation, resolution and response history. Notification records explicitly distinguish local logging from unavailable external delivery. |
| Reports | Deterministic evidence-linked summary, authorized JSON and printable HTML export, export audit, no invented LLM facts. |
| Administration | Accounts/access, registered-device inventory, phrase availability, category taxonomy, versioned thresholds/weights, retention preview/run and holds, audit inspection/integrity verification, capability/job health. |
| Privacy and audit | Encrypted persisted media, silent full-frame blurred derivatives, no raw-media download route, successful-source deletion, failed-source quarantine, protected append-only audit table with HMAC verification. |
| Demonstration | Ten seeded fictional Pakistani scenarios; authored transcripts, annotated events, title-card playback and seeded review context. Six local personas across five roles. All scenario outputs are labeled simulated. |
| UI | Shared navy/neutral/teal design, semantic labels, loading/error/empty states, responsive queue/investigation, keyboard focus, evidence-tab arrow keys, confirmation dialogs and accessible form labels. |

## Partial or constrained

- **Transcription:** optional local faster-whisper adapter is integrated. No package/weights were available for a real inference run. Real uploads disclose missing transcription.
- **Risk/context:** tested deterministic phrase rules and an eight-second weighted priority calculation, with a single-modality cap and human-review safety override. No validated intent classifier or calibrated misconduct probability.
- **Privacy:** conservative whole-frame blur and silent playback replace face-specific tracking. This protects more of the frame but removes useful detail and does not guarantee anonymity. No authorized unblurred-source workflow or original-preservation option is offered.
- **Retention:** working administrator preview/confirm/delete procedure, including quarantine and holds. It must be run manually. Backups and host remnants are outside this application's deletion scope.
- **Evidence:** real uploads receive one initial frame and a first-12-second excerpt. These are not claimed to localize detected visual events. Demo title cards are playable fixtures, not recordings of their scripts.
- **Capture/devices:** browser recording and registry are functional. Registry entries do not authenticate physical body cameras or ingest CCTV.
- **Security:** application controls are exercised by tests. TLS, encrypted host volume, hardened hosting, backup restoration, OS resource limits, penetration testing, MFA and independent certification remain deployment work. SQLite metadata/transcripts are not encrypted by this app.
- **Scale:** single-host, one-worker implementation; dashboard aggregation, registry and some admin lists are suitable for the demonstration dataset, not benchmarked at operational scale.

## Unimplemented

Trained gesture/hand landmarks, pose/proximity/aggression models, violence/weapon/injury/accident detection, vocal tone and speaker diarization, automatic Urdu transliteration, semantic context learning, live multi-camera ingestion, offline sync, RAG/LLM generation, external SMS/push/dispatch integration, identity verification, multi-tenant isolation and model-quality evaluation on a consented labeled dataset.

The PRD's targets for model accuracy/F1, a 50-scenario evaluation dataset, and operational latency have **not** been established. Test functions and parameterized rule examples are not a substitute for that dataset.

See [executed checks](docs/VERIFICATION.md), [numbered PRD coverage](docs/PRD_COVERAGE.md), [security boundaries](docs/SECURITY.md) and [setup](README.md).
