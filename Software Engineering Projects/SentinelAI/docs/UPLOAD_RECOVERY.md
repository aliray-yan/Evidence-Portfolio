# Recoverable phone and browser transfers

Capture sends the recording to the same authenticated backend used by the desktop dashboard. The current browser uses resumable uploads; the original multipart `/api/cases/upload` route remains available and shares the same case-creation and duplicate checks.

## User workflow

1. Select or record an authorized video, confirm consent and enter case details.
2. Submit. The browser checks the file checksum, starts a server transfer and sends parts up to 1 MB. Progress counts bytes acknowledged as saved by the server.
3. If connectivity fails, the page shows **Upload paused** and preserves the selected file and case details. Reconnect and select **Resume upload**. The server supplies its saved position, including parts it received before a response was lost.
4. Use **Pause upload** to stop sending. **Discard transfer** requires confirmation and deletes the incomplete server transfer while leaving the selected file on the page.
5. The complete file is checked against its declared size and SHA-256. Only then is a case/job created. Losing the final acknowledgement and retrying returns the same case.

Keep the page open to retain the file/recording in browser memory. A reload requires reselecting the **same** file and reentering **identical** case metadata within 24 hours to rediscover the transfer. Unsaved camera recordings are not recoverable after closing the page. There is no IndexedDB/local-storage media copy, offline submission queue or background mobile service. A trusted HTTPS origin or localhost is required for browser checksum/camera APIs.

## Server controls

Each transfer is private to its initiating account, including against other supervisors/admins. Session authentication, role checks, CSRF and origin protections apply. Case access and any supplementary-evidence request are checked again when completing the transfer.

Parts are Fernet-encrypted BLOBs in SQLite, with strict sizes, offsets and idempotent duplicate-part checks. No part-download endpoint exists. The final source uses the existing encrypted evidence store and processing/retention policy. Transfer metadata remains subject to the same host-volume encryption requirement as other database records.

At most three incomplete transfers per account and 500 MB of declared incomplete-transfer capacity per server are allowed. Transfers expire 24 hours after creation. Expired transfer records, metadata and encrypted parts are removed at server startup, when another transfer starts, and by the enabled processing worker's maintenance pass (checked once a minute between jobs). A stopped or busy worker does not guarantee deletion at an exact wall-clock deadline. Completion immediately deletes staging parts. This is logical deletion; backups, WAL pages and storage remnants require separate host retention/encryption controls.

Case creation, job creation, session completion and part removal share a serialized database transaction. Different transfers with the same owner/content also use the existing case deduplication rule. Received, resumed, discarded, completed and expired sessions are audited without copying titles or coordinates into audit metadata.

## Desktop updates

Overview, case queue and alert list refresh every ten seconds while visible and online. They refresh on return to the tab or restoration of connectivity, avoid overlapping requests and keep URL filters. A last-checked indicator shows the freshness of the data; errors do not claim successful synchronization. An open alert response retains its original version so a concurrent change cannot silently authorize a stale decision.

## Reproduce the checks

```powershell
python -m pytest -o addopts='' -q tests/test_resumable_uploads.py
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- e2e/transfer.spec.ts
```

The browser test uses a generated pattern, an emulated mobile viewport, a separate reviewer session and deliberately lost part/final responses. A physical phone, Wi-Fi link and certificate trust still need the [manual phone test](MOBILE_TEST.md).
