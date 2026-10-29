# Security model

## Trusted boundaries

The backend is the authority for sessions, scope, mutation validation and media delivery. Frontend navigation is only a convenience. Citizen/officer scope is ownership; responders see cases with alerts; supervisors/admins see all cases. This is a single-organization local prototype, with no multi-tenant isolation claim.

Passwords: salted scrypt. Sessions: 48-byte random tokens, hash stored in SQLite, eight-hour expiry, HttpOnly Strict cookie. Mutations require a session CSRF token and reject mismatched browser origins. Demo login is a separately labeled loopback-only facility. Hostnames are allowlisted; the default server binds 127.0.0.1. Password-based sign-in is throttled, and account role/status changes invalidate its sessions.

Reads of cases/media, searches, exports, denied API access, reviews, alerts, notes and sensitive administration generate audit records. Search text is represented by a hash, not copied into audit metadata. Reasons are user-supplied and may themselves contain personal information; reviewers must minimize sensitive details. Hashes of low-entropy searches are not anonymization guarantees.

## Evidence protection

File names supplied by the client are never used as storage paths. Random storage names are strictly validated. File signatures, decode success, dimensions, duration and upload length are checked. Browser upload progress represents bytes, and processing states come from persisted jobs. Duplicate content is scoped by case owner; a requested supplementary recording inherits its parent case's owner after an access check. Protected original evidence has no retrieval route. Derived artifacts are served only after privacy processing and an authorization check; byte-range requests pass the same checks.

Persisted media uses authenticated encryption. Original handling, upload parsing and analysis temporarily require plaintext. The SQLite database, temporary folders, OS upload spool, filesystem metadata and backups need host-volume encryption and restrictive OS access controls. The demo key is stored locally for reproducibility, not in a production secret manager. Cryptographic key rotation and hardware-backed key custody are not implemented.

Default entire-frame redaction includes faces and removes playback audio. It cannot guarantee anonymity from all contextual clues. No unblurred-access route exists. The cost is reduced investigation detail. Keep real data out of this FYP demo unless an authorized deployment addresses these limitations.

## Audit and retention

All audit writes are serialized with state changes. SQLite triggers reject audit modification/deletion and HMAC chaining detects corruption. A privileged host operator can remove triggers or replace the database/key. This is not WORM storage, external attestation or a legally certified chain of custody.

Manual retention previews and confirmations protect against accidental deletion; legal holds exclude cases. Content deletion retains audit events and operational tombstones. Alert history and policy rationale may remain for accountability, so minimize free-text personal data there. Backups and SSD remnants require a separate secure disposal policy.

## Operational limitations

TLS termination, encrypted volumes, backups, OS isolation, a secret manager, authenticated model distribution and server monitoring are deployment responsibilities. The bundled Caddy template is not a deployed control. Browser camera capture requires localhost or HTTPS. Avoid multiple uvicorn workers: job recovery is single-process and model inference is CPU intensive. FFmpeg runs with bounded timeout, but OS/container resource limits are needed against hostile media at scale.

No external notification service, incident dispatch, automatic punishment, identity matching or guilt determination exists. Alerts require a human response. No legal, evidentiary or operational certification is claimed.
