# Architecture and operational contracts

Current scope: vision-only encounter analysis. The user's later requirement
supersedes speech/audio fusion in the original PRD. See the
[complete project handover](<../project info documentation.md>) for the file
catalog, installed assets, training history and remaining work.

## Runtime

The React/TypeScript frontend is built with Vite. One FastAPI process serves the built frontend, JSON API and authorized media from one origin. SQLite WAL stores application records. Local worker threads claim durable jobs transactionally and run bounded FFmpeg/OpenCV operations. Dedicated same-stream analysis uses bounded queues and shared model locks; new ordinary jobs wait during active streaming. Do not start multiple uvicorn workers: recovery and transport assume one application process.

No browser storage is authoritative for cases, sessions, review decisions or settings. Sessions are opaque HttpOnly cookies; their hashes and expiry live in SQLite. The client receives a CSRF token after sign-in and sends it with mutations. Refreshing the page retrieves the existing session.

## Data

Ordered SQL migrations run during database initialization. `001_initial.sql` defines users, sessions, login throttles, cases, evidence, transcript segments, events, reviews, notes, alerts, response history, notification attempts, jobs, devices, settings, phrase rules and audit entries. `002_supplementary_evidence.sql` adds links between requested cases and separate recordings. `003_resumable_uploads.sql` adds owner-private transfer sessions and encrypted part BLOBs with expiry. Migrations 004–010 add outbound attempts, reading guides, search indexes, test flags, live sessions/segments, lane metadata and encrypted stream results. A migration ledger prevents repeated application. Legacy transcript/phrase tables preserve history; their existence does not enable new audio analysis.

Case-to-media/transcript/event relationships preserve source IDs and timestamps. Evidence rows include hashes of the plaintext artifact; file paths use random internal names. Assessment records snapshot the policy/version and source references. Case and alert versions detect concurrent decisions. Administrative settings carry versions too.

Supplementary uploads require access to a case currently requesting evidence. They inherit that case's owner, retain their own processing history, and are linked in both directions. Duplicate content is deduplicated per evidence owner. The original case version advances on the first link, invalidating stale pending decisions. A link does not automatically conclude the request or assert that new processing succeeded. Linked-case metadata is filtered by the requesting user's normal case scope.

## Routes and authority

| Area | Contract | Authority |
| --- | --- | --- |
| `/api/auth/*` | Sign-in, current session, sign-out, separately gated demo persona login | Public sign-in; session for current/logout |
| `/api/dashboard`, `/api/cases` | Scoped metrics and paginated/filterable queue | Every signed-in role, restricted by case scope |
| `/api/uploads`, `/{id}`, `/{id}/complete` | Create/resume transfer, receive bounded encrypted parts, inspect/discard, checksum and finalize atomically | Initiating account only, among citizen/officer/supervisor/admin roles |
| `/api/cases/upload` | Multipart recording, consent, metadata, optional `parent_case_id`; returns persisted case ID and duplicate flag | Citizen, officer, supervisor, admin |
| `/api/cases/{id}` | Complete accessible investigation, provenance and linked recordings | Case scope |
| `/api/cases/{id}/review` | Action, required rationale, expected version, optional assignee | Supervisor/admin; participants may appeal their own completed decision |
| `/api/cases/{id}/notes`, `/retry` | Persist note; retry an available failed source | Case scope for notes; owner/reviewer for retry |
| `/api/evidence/{id}` | Authorized privacy-processed derivative, supports byte ranges | Case scope; raw originals are never served |
| `/api/cases/{id}/report` | Audited JSON or printable HTML | Case scope |
| `/api/alerts`, `/{id}/action` | Paginated alert list and versioned response actions | Responder, supervisor, admin |
| `/api/admin/*` | Account/device/library/policy/retention/audit administration | Admin only |
| `/api/health` | Capability status, scoped recent jobs, storage/transport limitations | Signed-in user |

The API uses ordinary HTTP errors with a `detail` message. Validation errors identify the invalid fields. Expected version conflicts return 409. Forbidden roles return 403; inaccessible cases/media return 404. Missing retained media returns 410; incomplete privacy processing returns 423; ciphertext integrity failure returns 503 without exposing the artifact.

## Processing and recovery

1. Authenticate, validate consent/metadata, accept supported container signatures under the size limit, hash content and encrypt the original. Store the case/job in one database transaction.
2. A worker claims a queued job in its lane and increments its attempts. Open uploaded files with the explicit FFmpeg decoder and bounded open/read timeouts. Reject missing video. Browser containers with unknown duration/frame metadata are normalized into a temporary silent 30fps H.264 file; conversion is bounded to the upload duration limit plus one second so oversized input fails subsequent validation rather than being silently accepted after truncation. Decode/validate duration, resolution and frame rate.
3. Run the configured experimental visual-exchange adapter on original video, or persist its unavailable state. Person/hand/rectangular-patch observations must form a consecutive-frame transfer hypothesis. No speech, acoustic, speaker, keyword or conversation analysis runs, even if old model selections remain on disk. Configured inference failures persist a retryable failure rather than a fabricated result.
4. When configured, verify/load the fixed-architecture R3D-18 bundle and analyze the temporary original. A configured-model failure retains the encrypted source for retry. Produce a silent, entire-frame blurred H.264 review video, frame and excerpt; the strongest flagged visual window determines the latter timestamps, or the opening if no visual flag exists. Store derivatives encrypted. No derivative is served before privacy status allows it.
5. Persist visual model events and source references, calculate a versioned visual-only assessment, and index evidence references for deterministic summaries. Model hash/version/threshold/window scores are snapshotted in assessment JSON. Flagged exchange/fight/object candidates receive the policy's Ambiguous review priority; otherwise the score is null and the label Unassessed. Both require review. Neutral hand/pose observations do not add points, and there is no automatic emergency override. This is a heuristic priority, not model confidence or a calibrated misconduct probability.
6. Mark partial/ready for review and remove the original. A processing exception persists failure details and retains the encrypted original for controlled retry/quarantine retention.

Retries replace derived records and relink existing alert evidence without duplicating cases or alert types. On process restart, running jobs return to the queue. SQLite state and filesystem deletion cannot be a single atomic transaction; a host crash can leave orphaned encrypted files or temporary processing files. Protect the volume, monitor storage and handle recovery under an operator procedure. This implementation does not claim a crash-proof evidence vault.

Configured `LocalPerception` and `LocalObjects` add timestamped neutral observations and review candidates before redaction. Acoustic inference is retired. `face_review_copy` produces a separately encrypted selective copy restricted until `POST /api/cases/{id}/privacy-review` records supervisor/admin approval. This never grants access beyond existing case scope. `backend.retention` shares manual and opt-in scheduled deletion; `backend.backup` provides a bounded encrypted snapshot/restore CLI.

`POST /api/alerts/{id}/notify` and `GET /api/notifications/status` require responder/supervisor/admin authority. Migration 004 adds persistent outbound attempt state. Configuration and webhook semantics are described in [operations](OPERATIONS.md).

## Integration seams

`backend.diarization`, `backend.speech`, `backend.acoustics` and English/phrase rules remain as historical research/test modules, not new encounter processing. `backend.retrieval` exposes local E5 embeddings and a single-operation lock shared by indexing/search; `backend.evidence_search` enforces case access, CSRF, rate limits and post-inference consistency. The media worker handles queued search jobs when no media job is waiting. Migration 006 persists index state and encrypted chunk vectors/offsets. Source/model hashes reject stale indexes; retention deletes them, retry invalidates them, and startup recovers interrupted jobs. Query content is audited only as a keyed digest. See [local language features](LOCAL_LANGUAGE_FEATURES.md).

`VisionAnalyzer` defines a replaceable interface. `LocalViolence` is a CPU R3D-18 adapter using shared `sentinel_ml` preprocessing and a strict local tensor-weight manifest; fresh clones have no model selection; this workstation has a locally selected trained bundle. Explicit environment settings override `.local/model-selection.json`. Models are cached until process restart. The old `Transcriber`, `LocalWhisper`, `phrase_events()` and `fuse()` contracts are retained for history/tests, not used by new jobs. Notifications always persist local records. An optional manually requested signed HTTPS webhook tracks sending, provider acceptance/rejection and unknown delivery. Demo/synthetic records cannot send external incident notifications; no notification provider or live dispatch is configured.

`training/` is separate from case storage. Its standalone generated Kaggle notebook inventories one dataset subset, records exact-duplicate exclusions (holding out cross-split copies), freezes a held-out split, fine-tunes a pretrained architecture and exports a versioned bundle. Test-only smoke bundles are rejected by the serving loader. Separate exchange research tools explicitly download attributed datasets, preserve source partitions, cache frozen RGB features, train a temporal head and run fixed screening. Three learned candidates failed detection checks; the completed DINO candidate passes those checks but fails the CPU speed gate (281.10 ms p95 versus 250 ms). It remains disabled pending optimization and integration testing. The research loader refuses operational activation, and the completion monitor never activates models. There are no runtime dataset downloads, arbitrary remote model code or model-based permission changes.

`backend.mobile` prepares a separate password-only instance with temporary local TLS certificates and a private-IP bind. Device trust installation and private-network firewall approval are manual. It does not provide public hosting or offline synchronization. Continuous live video is supplied separately by `backend.stream_transport`, the Go bridge, `backend.stream_timing`, `backend.stream_analysis` and the React live client: authenticated WHIP/WHEP through MediaMTX, independent original-stream analysis, source RTP alignment, bounded queues/ring, normal-speed playback, configurable requested viewing buffer, late alerts, replay and explicit case preservation. Audio packets are ignored. See [streaming contracts and measured limits](LIVE_STREAMING.md).

The summary is a projection of persisted artifacts/events/reviews. It cannot introduce quotations, identities or observations absent from those records. See [analysis limitations](AI_LIMITATIONS.md) before adding a model or publishing any evaluation claim.

`backend.reading_model` is a separate, optional OpenRouter selector. `backend.reading_assistant` exposes reviewer-only `GET/POST /api/cases/{id}/reading-guide`: GET constructs an exact bounded source preview; POST checks consent, case version/hash, quota and a single persisted in-flight slot before calling the provider outside the database transaction. Only source aliases and fixed follow-up codes can pass validation. Migration 005 persists statuses and provenance; stale responses are not displayed, retention removes the guide, and startup fails interrupted attempts without resending. The default NVIDIA provider is restricted to authored synthetic cases. Its selections never enter risk fusion or the deterministic report. [Configuration and privacy](OPENROUTER.md).

`backend.model_import` bounds and validates a trusted ZIP, checks exported split/prediction consistency, loads fixed-architecture tensor weights and selects a verified installation for the next restart. Startup audits changes to the configured model hash/version. `backend.uploads` handles encrypted resumable transfers with a 24-hour expiry, per-account/server quotas, atomic completion and idempotent retry. Overview/queue/alerts poll every ten seconds while visible and online. See [upload recovery](UPLOAD_RECOVERY.md).
