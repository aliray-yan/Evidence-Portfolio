# Privacy, retention, backup and notification operations

## Review and release a masked copy

Successful configured face processing creates an encrypted, silent `face_preview`. Supervisors and administrators can inspect it in **Privacy review**. Participants and responders receive only the entirely blurred derivative until a reviewer confirms that they inspected the complete masked copy and supplies a rationale. Approval is version-checked, attributed and audited. It does not broaden access to the case itself. Revocation restores full blur on subsequent requests; already viewed or downloaded bytes cannot be recalled.

The detector can miss faces and other identifying information. Entire-frame fallback applies when it finds no face, not when it finds one face but misses another. Playback audio is removed; transcripts remain sensitive and protected by case permissions. Original preservation and unblurred playback are not implemented. Successfully processed originals are deleted; failed originals remain encrypted for retry until quarantine retention.

## Retention

Administrator **Privacy & retention** offers preview/manual deletion and an optional schedule. Scheduling defaults **off**. Enabling it requires a rationale and confirmation; an overdue run may execute as soon as the worker becomes idle. The interval is 1–168 hours. The worker checks between jobs; a stopped or busy worker can delay deletion. The page shows the most recent successful scheduled run.

Policy age and quarantine age are applied consistently in both paths. Legal holds exclude cases; running/queued cases are not purged. Evidence, transcript, notes, review content and alert-response reasons are erased; minimal tombstones and the append-only audit history remain. Free-text audit rationale can itself contain personal information, so minimize it. Backups, SSD remnants and OS temporary storage need their own disposal policy.

## Encrypted backup and restore

```powershell
.\.local\runtime\Scripts\python.exe -m backend.backup create --output .local/backups/snapshot-2026-11-01.sab
.\.local\runtime\Scripts\python.exe -m backend.backup restore --backup .local/backups/snapshot-2026-11-01.sab --destination .local/restored-2026-11-01 --key-file .local/data/media.key
```

Choose new names on subsequent runs. Creation refuses an existing file or a destination inside the live data directory. A write lock holds a consistent SQLite snapshot and referenced encrypted media; the entire archive, including database metadata/transcripts, is then encrypted with the current media key. The tool supports at most **512 MiB** of snapshot data and uses memory; larger stores need a host-level encrypted backup procedure.

The key is **not inside the archive**. Keep a protected separate recovery copy; key loss makes recovery impossible. Restore only accepts a new destination, verifies archive hashes, database integrity, the audit chain and every media hash, revokes sessions, and requeues interrupted processing. Point `SENTINEL_DATA_DIR` to the restored folder only after inspecting it. Non-demo operation still requires the matching `SENTINEL_ENCRYPTION_KEY`; a restored local key file does not bypass that requirement. Models, selection manifests and application code are not bundled—preserve them separately to reproduce processing. Restore has been exercised on test evidence, not a large operational vault.

## Optional external webhook

No notification provider is configured on this workstation. Demo mode and synthetic cases **cannot send external incident notifications**, even if webhook credentials are supplied. Local alerts and acknowledgement/escalation/resolution continue to work independently. The separately authorized synthetic-only [cloud reading guide](OPENROUTER.md) is not an incident notification or dispatch service.

For an authorized non-demo deployment, set an HTTPS `SENTINEL_NOTIFICATION_URL` and a secret of at least 32 characters in `SENTINEL_NOTIFICATION_SECRET`. An authorized responder explicitly chooses **Review external notification** in the alert workspace and confirms **Send notification** with a rationale. This sends only schema version, notification/alert/case IDs, severity, event time and `human_review_required`. It sends no footage, transcript, participant name or location. The downstream service must authenticate the request and decide any further routing.

The request has `Content-Type: application/json`, `Idempotency-Key` equal to the stable notification ID, and `X-Sentinel-Signature: sha256=<hex HMAC-SHA256 of exact body using secret>`. Verify the signature with a constant-time comparison and deduplicate on that key. Redirects and machine proxy credentials are not used. Only the operator-configured URL is allowed; there is no user-supplied destination field.

| State | Meaning |
| --- | --- |
| `sending` | A manually authorized request is in flight. Duplicate concurrent sends are rejected. |
| `accepted_by_provider` | HTTP 2xx received; the provider accepted the request. **Recipient delivery is unconfirmed.** |
| `rejected_by_provider` | Provider returned a non-2xx status; inspect configuration before retrying. |
| `delivery_unknown` | Timeout, network error or interrupted request; the provider may have received it. A manual retry reuses its idempotency key. |
| `unavailable` / `disabled_in_demo` | No permitted external delivery path. |

No automatic retry, delivery-receipt callback, SMS/push account or emergency dispatch integration is supplied. HTTP 2xx must never be presented as confirmation that a person or emergency service received the notification. Connector tests use a test double; no real provider has been contacted by this feature.
