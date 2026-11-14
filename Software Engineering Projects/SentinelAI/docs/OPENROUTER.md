# Optional cloud reading guide

The investigation's **Evidence summary → AI reading guide** is an optional reviewer tool. It selects existing transcript/event excerpts and predefined review checks. It never supplies factual prose, risk scores, legal conclusions or review decisions. The deterministic summary and report remain independent.

The default model is [`nvidia/nemotron-3.5-lightning:free`](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free). Its free endpoint excludes personal/confidential information and may log requests for improvement. **SentinelAI blocks real cases for NVIDIA even if real-case cloud transfer is otherwise enabled.** Only authored synthetic sources from synthetic cases are eligible. Model selection on a fictional script is actual cloud inference, but the script is still not recorded evidence. This is not a police-domain accuracy evaluation.

## Setup and use

On Windows, from the project directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-openrouter.ps1
powershell -ExecutionPolicy Bypass -File .\check-openrouter.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Enter the key only into the hidden setup prompt. The setup stores Windows-user-bound DPAPI ciphertext in ignored `.local/secrets/openrouter.dpapi`. The launcher decrypts it into the backend process environment. Do not paste keys into chat, frontend files, screenshots or Git. The ciphertext is tied to the Windows account; it is not a portable backup or a defense against compromised software running as that user. Other operating systems/deployments should supply `OPENROUTER_API_KEY` through their secret manager. The sample `.env` is documentation, not an automatically loaded configuration.

The connection check sends two fixed fictional English excerpts, never the case database, and saves a successful validated selection in ignored `.local/openrouter-verification.json`. Its timing is one request's elapsed time, not a speed guarantee.

On this workstation the final connection check succeeded in 4.235 seconds. A separate live UI check generated a guide from five authored scenario excerpts in 2.5 seconds and verified persistence after reload, source seeking and unchanged case decisions. These are functional smoke checks, not a language-quality benchmark. To repeat that explicit local UI check, set `SENTINEL_LIVE_READING_CHECK=1`, point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your installed Chromium when needed, then run `node e2e/reading-guide-live.mjs` against the running port-8000 app. It reuses an existing current guide instead of spending another request.

1. Sign in as **Supervisor** or **System administrator**.
2. Open a synthetic case, choose **Evidence summary**, then **Prepare reading guide**.
3. Choose **Review cloud transfer**. Inspect the exact text, timestamps, source labels and omission/truncation notices.
4. Check the authorization box and choose **Send excerpts & generate**.
5. Inspect the selected excerpts and click their timestamps to seek the evidence player. For synthetic cases the player is only a title-card timeline, not footage of those events.

Opening a case or preview makes no model request. Provider failures are shown; no result appears until its fields and source references pass validation. A refresh retrieves persisted status and does not automatically retry. After a failure, preview and explicitly submit again. Changed cases require a fresh preview; obsolete selections are hidden. A completed result for the same model/case version/sources is reused.

## Configuration and boundaries

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | empty | Backend-only credential; launcher loads the local encrypted copy when absent. |
| `SENTINEL_OPENROUTER_MODEL` | `nvidia/nemotron-3.5-lightning:free` | An explicit `vendor/model:free` ID. No paid or random-router model is accepted. |
| `SENTINEL_OPENROUTER_REAL_CASES` | `0` | Optional deployment opt-in for other compatible providers; not enabled on this workstation. NVIDIA remains blocked. |

The adapter uses HTTPS, a fixed provider URL, no redirects, zero prompt/completion/request price limits, no fallback, bounded responses and explicit timeout handling. NVIDIA receives a JSON instruction without the unsupported `response_format` parameter. Gemma supports JSON-object mode rather than strict provider-side JSON Schema. **The application enforces its exact schema in both paths**, rejecting extra prose, unknown references, duplicate selections, tool calls and truncated output. No repair pass or automatic retry sends another request.

There is one cloud request in flight across the app, a 30-second attempt cooldown, and a local limit of 20 attempts in a rolling day. These are application limits, separate from OpenRouter/provider quotas. Free services may be slow, unavailable or rate-limited. The initially tested Gemma free endpoints returned upstream rate limits; no paid fallback was used. Current model availability and terms may change.

The packet contains at most 24 chronological excerpts, each at most 600 characters, plus source type, timestamp, source alias, synthetic status and omission count. Local case/source identifiers, titles, location fields, media, notes and human decisions are excluded. This is **not anonymization**: transcript text can itself contain personal details. The preview discloses every excerpt. Synthetic cases filter out any source not explicitly authored as synthetic. Only administrators with deployment access can configure the real-case opt-in; no ordinary UI toggle exists.

For an explicitly authorized real-case deployment using another provider, requests additionally require `data_collection: deny` and `zdr: true`. These filters may leave no compatible free endpoint. They are not a replacement for reviewing provider/account policies, consent and organizational authorization. The real-case path has automated contract tests, not a live privacy certification. See [OpenRouter provider privacy](https://openrouter.ai/docs/guides/privacy/provider-logging) and [routing controls](https://openrouter.ai/docs/guides/routing/provider-selection).

## Persistence and troubleshooting

Migration `005_reading_guides.sql` stores request state, source hash, case version, model provenance and validated selections. It stores neither the API key nor raw provider prose/prompt copies. Protected audit events record preview/request/cache/failure/completion/obsolescence. Retention deletes the guide with case content. Restart marks interrupted requests as failed; it never automatically resends them. Keep one backend worker.

- **Key cannot be decrypted:** start under the Windows account that ran setup, or rerun setup there. Restricted automation accounts may not share that identity.
- **Provider rejected key:** rerun private setup and restart the application.
- **Rate limited / unavailable:** the deterministic summary still works. Wait and explicitly retry; do not infer success or buy credits automatically.
- **No compatible endpoint:** the model may lack the required parameters or privacy configuration. Review the current provider capabilities before changing the configured free model.
- **Invalid response:** generated fields failed validation. No generated factual claims are accepted. Retry later or retain the deterministic summary.
- **Case changed:** cancel the old preview and refresh; authorization applies to the exact reviewed packet.

The feature does not replace local Whisper, train the RWF model, recognize new gestures, add diarization, or establish intent. Selection completeness, Urdu/Punjabi suitability and reviewer benefit remain unmeasured.
