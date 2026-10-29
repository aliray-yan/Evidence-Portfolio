# Architecture and operational contracts

## Runtime

The React/TypeScript frontend is built with Vite. One FastAPI process serves the built frontend, JSON API and authorized media from one origin. SQLite WAL stores application records. A background thread claims durable jobs transactionally and runs bounded FFmpeg/OpenCV operations. Do not start multiple uvicorn workers: startup recovery assumes one active processor.

No browser storage is authoritative for cases, sessions, review decisions or settings. Sessions are opaque HttpOnly cookies; their hashes and expiry live in SQLite. The client receives a CSRF token after sign-in and sends it with mutations. Refreshing the page retrieves the existing session.

## Data

Ordered SQL migrations run during database initialization. `001_initial.sql` defines users, sessions, login throttles, cases, evidence, transcript segments, events, reviews, notes, alerts, response history, notification attempts, jobs, devices, settings, phrase rules and audit entries. `002_supplementary_evidence.sql` adds links between requested cases and separate recordings. A migration ledger prevents repeated application.

Case-to-media/transcript/event relationships preserve source IDs and timestamps. Evidence rows include hashes of the plaintext artifact; file paths use random internal names. Assessment records snapshot the policy/version and source references. Case and alert versions detect concurrent decisions. Administrative settings carry versions too.

Supplementary uploads require access to a case currently requesting evidence. They inherit that case's owner, retain their own processing history, and are linked in both directions. Duplicate content is deduplicated per evidence owner. The original case version advances on the first link, invalidating stale pending decisions. A link does not automatically conclude the request or assert that new processing succeeded. Linked-case metadata is filtered by the requesting user's normal case scope.

## Routes and authority

| Area | Contract | Authority |
| --- | --- | --- |
| `/api/auth/*` | Sign-in, current session, sign-out, separately gated demo persona login | Public sign-in; session for current/logout |
| `/api/dashboard`, `/api/cases` | Scoped metrics and paginated/filterable queue | Every signed-in role, restricted by case scope |
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
2. A worker claims the oldest queued job and increments its attempts. Decode/validate duration, resolution and frame rate.
3. If a locally configured speech model is usable, extract 16kHz mono audio and transcribe. Otherwise record the unavailable stage. Speech failure is disclosed as partial analysis.
4. Produce a silent, entire-frame blurred H.264 review video, frame and initial excerpt. Store derivatives encrypted. No derivative is served before privacy status allows it.
5. Persist available segments and phrase events, calculate a versioned assessment, and index evidence references for deterministic summaries. Actual missing vision analysis prevents a Normal/Low Risk clearance.
6. Mark partial/ready for review and remove the original. A processing exception persists failure details and retains the encrypted original for controlled retry/quarantine retention.

Retries replace derived records and relink existing alert evidence without duplicating cases or alert types. On process restart, running jobs return to the queue. SQLite state and filesystem deletion cannot be a single atomic transaction; a host crash can leave orphaned encrypted files or temporary processing files. Protect the volume, monitor storage and handle recovery under an operator procedure. This implementation does not claim a crash-proof evidence vault.

## Integration seams

`Transcriber` and `VisionAnalyzer` define replaceable interfaces. `LocalWhisper` is the optional speech implementation. Vision capability remains unavailable. `phrase_events()` and `fuse()` are deterministic and independently tested. Notifications currently write only local records and an explicit unavailable external status; there is no configured provider adapter or live dispatch integration.

The summary is a projection of persisted artifacts/events/reviews. It cannot introduce quotations, identities or observations absent from those records. See [analysis limitations](AI_LIMITATIONS.md) before adding a model or publishing any evaluation claim.
