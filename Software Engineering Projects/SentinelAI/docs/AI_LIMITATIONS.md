# Analysis method and limitations

## Implemented components

Media validation and artifact extraction use real OpenCV/FFmpeg processing. Phrase matching is deterministic and uses persisted active library entries. Source segments are retained, and matched phrases link to their exact segment IDs. Pattern matching normalizes punctuation and Unicode; it does not translate, identify speakers, understand sarcasm or perform robust semantic reasoning.

LocalWhisper implements the Transcriber interface. It loads only an explicitly configured local directory, CPU int8, and does not download weights. This adapter is integrated but was not inference-tested because no weights were present. VisionAnalyzer is a replaceable protocol, not an installed detector. The health page reports each distinction.

## Risk method: temporal-rules-v1

For each event, consider events starting within eight seconds. For each signal channel, take the maximum annotated/rule signal in that window, in the range 0–100. Multiply by the configured weights and sum. Take the highest window score.

Default policy: speech 0.30, gesture 0.15, body 0.15, context 0.25, temporal escalation 0.15. Thresholds: Low 10, Ambiguous 30, High 60, Emergency 85. These are **policy heuristics**, not learned or validated coefficients.

Any substantial phrase/gesture concern has an Ambiguous floor and requires review. A single non-safety modality is capped below High. Explicit supported safety indicators set an Emergency minimum and always require human review. Emergency classification requires that safety indicator; a numerical value above 85 alone does not imply an emergency.

Contribution rows show the weighted terms. Floors, single-modality caps and safety overrides can make the final score differ from their sum. The complete policy snapshot and version are recorded with the assessment. Policy edits do not alter history.

For real uploads, missing vision analysis prevents Normal/Low Risk clearance: such results are Unassessed with a null overall score. Speech flags, if a real transcript exists, may prioritize review while remaining partial. Synthetic inputs explicitly identify all event scores as authored annotations; their model confidence is null.

## Summary discipline

There is no generative LLM in the factual-summary path. The summary enumerates actual database rows and references. Transcript text is either local ASR output or an explicit authored demo script. Human conclusions remain attributed review records. Synthetic title-card videos provide a working time axis but do not substantiate the scripted interaction itself; every investigation screen discloses this.

## Not implemented / not validated

- Automatic gesture landmarks, hand classification, pose, proximity, aggression, violence, weapons, injury and accident detection.
- Speaker diarization, officer/citizen identity inference, tone/volume understanding and semantic context classification.
- Urdu-to-Roman-Urdu transliteration and reliable mixed-language ASR benchmarking.
- Learned/calibrated multimodal risk models, RAG vector retrieval and LLM summaries.
- Automatic event-specific visual excerpts: real uploads receive a clearly labeled first-12-second clip, not a claimed event localization.
- Real-time multi-camera/CCTV streaming, body-camera hardware, offline synchronization and live dispatch.

## Evaluation procedure

1. Obtain written informed consent and institutional authorization. Separate actor recordings from real-world data.
2. Split by actor/session/site to avoid train/test leakage. Keep ambiguous examples and false positives in the held-out set.
3. Have at least two trained human annotators label segment timestamps, quoted text, observable actions, uncertainty and expected review routing. Resolve disagreements separately.
4. Run a frozen model/rule/policy version. Save predictions, confidence fields, timing, missing modalities and artifact checksums.
5. Compute WER for transcription; event-level precision/recall/F1 with a declared timestamp tolerance; category confusion matrix; false positives/negatives; missing-evidence and reviewer-agreement rates.
6. Stratify by consented annotation dimensions and acquisition conditions. Report sample counts and uncertainty, including unsupported modalities.
7. Measure wall-clock processing and alert latency on named hardware. Exclude authored seed fixtures. Dashboard processing averages describe actual completed uploads only and are not model-quality benchmarks.

No labeled evaluation dataset was supplied, so the PRD's target metrics have not been measured or achieved by assertion.
