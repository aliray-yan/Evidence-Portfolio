# Implementation plan and initial audit

The selected SentinelAI directory contained no files on 2026-10-29. It is nested in an unrelated parent portfolio Git repository. No existing functionality was removed. Python 3.11, Node 24, FastAPI, pytest, cryptography, OpenCV and FFmpeg via imageio are available; faster-whisper is not installed.

## Priorities
1. Foundation: SQLite migrations, server-side permissions, opaque sessions, CSRF, password hashing, protected audit ledger.
2. Core: role-aware shell, operational dashboard, searchable cases, timestamped investigation, review decisions, assignments and appeals.
3. Evidence: validated uploads, encrypted storage, persistent processing queue, actual media conversion, default privacy redaction, retries and traceable deterministic summaries.
4. Intelligence: contextual phrase rules, temporal weighted fusion, explicit unavailable model interfaces, optional local Whisper, clearly simulated scenario fixtures.
5. Governance: alert lifecycle, local notifications, users, devices, thresholds, retention, libraries, health and audit inspection.
6. Verification: unit/API/security/media regression tests, browser journeys, responsive review, setup and limitation documentation.

## Decisions
- Keep deployment single-host and local by default; do not publish sensitive evidence to hosting services.
- SQLite WAL and transactional jobs are adequate for the FYP. Production distributed deployments require a database/queue migration.
- Encrypt media using a persistent environment key. Fail closed on missing privacy output.
- Use whole-frame redaction by default, a conservative substitute for imperfect face-only detection; retain no public raw-media endpoint.
- No autonomous dispatch or punitive outcomes. All review actions require a rationale.
- ASR may run only with an explicitly configured local model. Missing modalities produce a partial-analysis state.

See STATUS.md for the delivered acceptance matrix and verification results.
