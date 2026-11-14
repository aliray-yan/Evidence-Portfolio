# Security model

## Trusted boundaries

The backend is the authority for sessions, scope, mutation validation and media delivery. Frontend navigation is only a convenience. Citizen/officer scope is ownership; responders see cases with alerts; supervisors/admins see all cases. This is a single-organization local prototype, with no multi-tenant isolation claim.

Passwords: salted scrypt. Sessions: 48-byte random tokens, hash stored in SQLite, eight-hour expiry, HttpOnly Strict cookie. Mutations require a session CSRF token and reject mismatched browser origins. Demo login is a separately labeled loopback-only facility. Hostnames are allowlisted; the default server binds 127.0.0.1. Password-based sign-in is throttled, and account role/status changes invalidate its sessions.

Reads of cases/media, searches, exports, denied API access, reviews, alerts, notes and sensitive administration generate audit records. Search text is represented by a hash, not copied into audit metadata. Reasons are user-supplied and may themselves contain personal information; reviewers must minimize sensitive details. Hashes of low-entropy searches are not anonymization guarantees.

## Evidence protection

File names supplied by the client are never used as storage paths. Random storage names are strictly validated. File signatures, decode success, dimensions, duration and upload length are checked. Browser upload progress represents bytes, and processing states come from persisted jobs. Duplicate content is scoped by case owner; a requested supplementary recording inherits its parent case's owner after an access check. Protected original evidence has no retrieval route. Derived artifacts are served only after privacy processing and an authorization check; byte-range requests pass the same checks.

Persisted media uses authenticated encryption. Original handling, upload parsing and analysis temporarily require plaintext. The SQLite database, temporary folders, OS upload spool, filesystem metadata and backups need host-volume encryption and restrictive OS access controls. The demo key is stored locally for reproducibility, not in a production secret manager. Cryptographic key rotation and hardware-backed key custody are not implemented.

Default entire-frame redaction includes faces and removes playback audio. An optional selective face-masked copy is restricted to reviewers until a version-checked, rationale-backed privacy release; revocation affects future requests only. This cannot guarantee anonymity or detect every face/identifier. No unblurred-access route exists. Keep real data out of this FYP demo unless an authorized deployment addresses these limitations.

## Audit and retention

All audit writes are serialized with state changes. SQLite triggers reject audit modification/deletion and HMAC chaining detects corruption. A privileged host operator can remove triggers or replace the database/key. This is not WORM storage, external attestation or a legally certified chain of custody.

Manual retention previews and confirmations protect against accidental deletion; the optional administrator-authorized schedule defaults off and runs between jobs. Legal holds exclude cases. Content deletion erases alert-response reasons and retains audit events/operational tombstones. Minimize personal details in retained audit/policy rationale. Encrypted backup/restore is implemented with integrity checks and session revocation; the key must be protected separately. Backups and SSD remnants require their own disposal policy.

## Operational limitations

TLS termination, encrypted volumes, backups, OS isolation, a secret manager, authenticated model distribution and server monitoring are deployment responsibilities. The bundled Caddy template is not a deployed control. Browser camera capture requires localhost or HTTPS. Avoid multiple uvicorn workers: job recovery is single-process and model inference is CPU intensive. FFmpeg runs with bounded timeout, but OS/container resource limits are needed against hostile media at scale.

A manual signed webhook connector exists, but no external notification provider or incident dispatch is configured. Demo and synthetic cases cannot send external incident notifications. No automatic punishment, identity matching or guilt determination exists. Alerts require a human response. No legal, evidentiary or operational certification is claimed.

## Optional cloud reading guide

Local speaker/search components do not invoke the cloud reading guide. Speaker voice embeddings are transient, recording-specific and never retained for identification. Search vectors are encrypted using the existing media key; access uses the same case scope before and after inference. Source excerpts are reconstructed from current records and cannot be served through a public vector endpoint. Index jobs, searches and failures are audited without plaintext query contents. Retention and processing retries remove indexes/chunks; a deletion race cannot recreate them. Database pages/backups still require encrypted host storage and a separate disposal policy.

Supervisors/admins can explicitly preview and authorize a bounded source packet to OpenRouter. The default free NVIDIA endpoint is synthetic-only, including an adapter-level real-data prohibition; case access alone never authorizes background transfer. Source hashes and case versions prevent silently changed previews. The backend accepts only existing source aliases and fixed follow-up codes, not generated factual claims or instructions. Keys remain server-side, with Windows DPAPI storage for the local launcher. Provider error details are sanitized. Audit/retention include request state; raw prompts and provider prose are not persisted. Excerpt text is not automatically anonymized. Provider policies, availability and the opt-in real-case boundary are detailed in [OPENROUTER.md](OPENROUTER.md).
