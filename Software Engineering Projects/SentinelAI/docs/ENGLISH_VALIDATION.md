# English payment-context development checks

> **Historical scope superseded 5 November 2026.** Speech, speaker/sound analysis, phrase/conversation classification and multimodal fusion no longer run. Historical research records below are retained for traceability, not current capabilities or setup instructions. See [current vision-only scope](VISION_ONLY.md). Evidence search remains available.

Updated 2 November 2026. English handling now includes bounded phrase-context rules for personal payment, missing receipts, concealment, conditional demands, official payment, refusals, quotations and reported allegations. The rules are **not a trained bribery classifier**. Exact phrase coverage and ASR mistakes can cause missed indicators or false positives; human review is required. A single phrase never establishes guilt or independently establishes High Risk.

## Fresh videos

Ten newly authored MP4s live in `.local/test-videos/`, with a combined `SentinelAI-English-Test-Pack.zip`. They were made for this task and were not part of the earlier seeded scenarios or Kaggle training. They contain fictional English dialogue spoken by two Windows synthetic voices over labeled title cards. They contain **no footage of people, gestures or actual incidents**. They are development fixtures authored alongside the rules, not an independent held-out benchmark.

Authenticated users can download them from **Capture & upload → Fresh videos for testing** when demo mode or `SENTINEL_TEST_VIDEOS=1` is enabled. The phone-test server enables this catalog. The server validates each file's checksum before download, audits access, and recognizes the supplied checksums on upload. The dedicated mobile server additionally forces every upload to a test recording, including re-encoded phone copies that no longer match an original checksum. Case/alert/report labels distinguish uploaded test recordings with actual inference from seeded scenarios with simulated findings. External notifications are forbidden for both.

| Video | Scenario | Intended speech-rule routing |
| --- | --- | --- |
| EN-01 | Official online payment | No affirmative payment concern |
| EN-02 | Personal cash and waived ticket | Ambiguous human review |
| EN-03 | Counter payment with receipt | No affirmative payment concern |
| EN-04 | Direct payment without receipt | Ambiguous human review |
| EN-05 | Explicit refusal | No affirmative payment concern |
| EN-06 | Conditional payment demand | Ambiguous human review |
| EN-07 | Reported allegation | Review as an allegation, not an observed fact |
| EN-08 | Emergency assistance request | Local safety review; no dispatch |
| EN-09 | Ordinary cash purchase | No affirmative payment concern |
| EN-10 | Indirect personal benefit | Ambiguous human review |

The table describes speech routing, not a promised overall multimodal score. Missing capabilities keep overall analysis partial; absence of a flag is not a Normal/safety clearance. User-marked test recordings persist their label too; an existing deduplicated case retains its original provenance/history.

## Executed measurements

`evaluation.english_check` extracted audio from all ten actual MP4s, ran installed Whisper small CPU/int8, then applied the current phrase rules and risk fusion. **10/10 authored routing expectations matched**. Aggregate normalized word error rate was **4 edits / 232 reference words = 1.72%**, measured against the scripts. Total run time was **118.309 seconds**. These results are specific to clear synthesized English audio and the selected examples, not natural conversation or police-domain accuracy. The report contains source checksums, actual transcripts, events, model provenance and timings at `.local/ai-verification/english-development-check.json`.

The actual HTTPS media pipeline separately processed EN-01 and EN-02 using the configured local models and persisted their evidence. EN-01 remained **partial / Unassessed** with two transcript segments; EN-02 became **partial / Ambiguous** with four segments. Both remained test recordings with full-frame privacy blur. Original media retrieval was not exposed; anonymous protected-media access was denied. The recorded wait for EN-02 was 40.509 seconds; EN-01 was already processed when the corrected verification script resumed, so its 0.173-second wait is **not** its processing latency.

Safe presentation wording: **“English payment-context support passed ten newly authored synthetic development cases, including routine payments, refusals, allegations and unofficial-payment requests. Independent natural-speech validation remains outstanding.”**

Do not claim “English bribery detection is accurate,” “Pakistani accuracy is fair,” or superiority over Urdu/Punjabi from this evidence. Urdu/Roman Urdu/Punjabi features exist, but a comparable annotated recording set has not been measured. Record and annotate independent consenting speakers in both language groups, freeze the model/rules, and use [the evaluation protocol](EVALUATION.md). Report false positives, missed concerns, ASR error and reviewer agreement separately.

## Reproduction

On Windows with two installed speech voices and the project AI runtime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-english-test-audio.ps1
.local/runtime/Scripts/python.exe -m evaluation.create_test_videos
.local/runtime/Scripts/python.exe -m evaluation.english_check
```

The pack generator and evaluator refuse to overwrite completed artifacts. Preserve previous results when creating a new version. Unit regressions in `tests/test_english_context.py` cover denials, contrast clauses, allegations, uncertain ASR, routine language and safety quotation handling; these software tests are not independent accuracy measurements.

## Additional external viewing material

For a fresh external English reference, [UNODC / UN Global Compact, The Fight Against Corruption](https://thefightagainstcorruption.unodc.org/) includes the interactive module **“To Pay or not to Pay”**, about a customs payment request without a receipt. It is educational private-sector content, not a police-detection benchmark. The site provides viewing material; this project has not downloaded it or assumed permission to redistribute its footage. Use an authorized excerpt within the app's two-minute limit if research rights permit. It has not been used for these tests or model training.
