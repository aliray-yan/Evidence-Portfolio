# Analysis method and limitations

> **Historical scope superseded 5 November 2026.** Speech, speaker/sound analysis, phrase/conversation classification and multimodal fusion no longer run. Historical research records below are retained for traceability, not current capabilities or setup instructions. See [current vision-only scope](VISION_ONLY.md). Evidence search remains available.

## Implemented components

Media validation and artifact extraction use real OpenCV/FFmpeg processing. Phrase matching is deterministic and uses persisted active library entries. Source segments are retained, and matched phrases link to their exact segment IDs. Pattern matching normalizes punctuation and Unicode; it does not translate, identify speakers, understand sarcasm or perform robust semantic reasoning.

LocalWhisper implements the Transcriber interface. It loads only an explicitly configured local directory, CPU int8, and does not download weights. Whisper small is now installed and actual inference passed on locally generated English speech; Urdu/Punjabi and mixed-language accuracy remain unevaluated. LocalViolence implements the vision interface for an exported R3D-18 bundle. A user-trained Kaggle bundle is now installed locally. Its exported 400-clip test predictions reproduce 85.25% accuracy and 85.78% fight F1; actual local weight loading and application inference on a generated pattern passed. See [verified scope](MODEL_EVALUATION.md); the original dataset was not independently rerun here. The health page reports each distinction.

The standalone Kaggle notebook supplies transfer learning and held-out clip evaluation for RWF-2000, including the RWF subset of the user's additional collection. It does not combine that collection's RLVS source automatically, train XD-Violence audio-visual fusion, or validate police/mobile footage. See [training instructions](../training/README.md) for source permissions, split/leakage limits, export contract and import steps.

Public pretrained hand/pose, face and limited knife/scissors models are installed and real pipeline runs persist their provenance. See [local AI scope](LOCAL_AI.md). Neutral hand/pose observations add no risk points. Knife/scissors candidates use a fixed context cue of 40 and require Ambiguous human review; they never establish weapon use or an emergency. Face previews require manual privacy release.

Urdu-script phrase variants, explicit adjacent negation/quotation and nearby procedural clarification are supported rules. Negated/quoted or low-ASR-likelihood safety phrases withhold automatic safety escalation while retaining an ambiguous review cue. These narrow patterns are not robust semantic comprehension.

## Risk method: temporal-rules-v1

For each event, consider events starting within eight seconds. For each signal channel, take the maximum annotated/rule signal in that window, in the range 0–100. Multiply by the configured weights and sum. Take the highest window score.

Default policy: speech 0.30, gesture 0.15, body 0.15, context 0.25, temporal escalation 0.15. Thresholds: Low 10, Ambiguous 30, High 60, Emergency 85. These are **policy heuristics**, not learned or validated coefficients.

Any substantial phrase/gesture concern has an Ambiguous floor and requires review. A single non-safety modality is capped below High. Explicit supported safety indicators set an Emergency minimum and always require human review. Emergency classification requires that safety indicator; a numerical value above 85 alone does not imply an emergency.

Contribution rows show the weighted terms. Floors, single-modality caps and safety overrides can make the final score differ from their sum. The complete policy snapshot and version are recorded with the assessment. Policy edits do not alter history.

For real uploads, missing vision analysis prevents Normal/Low Risk clearance: such results are Unassessed with a null overall score. Speech flags, if a real transcript exists, may prioritize review while remaining partial. Synthetic inputs explicitly identify all event scores as authored annotations; their model confidence is null.

A configured research visual model samples sixteen frames per five-second window. Its softmax fight score is **uncalibrated**, separate from the overall priority score. Above the development-selected threshold it contributes a fixed body cue of 80 and context cue of 40, producing an Ambiguous review floor under the default policy. It does not set the safety/emergency override. A local `possible_conflict` alert requests review; no external dispatch occurs. These cue magnitudes are policy choices, not learned probabilities. The case stores model version, checksum, threshold, all window scores and measured inference time; the report preserves this provenance. A negative visual result cannot clear unsupported modalities. Exact action localization, aggressor identity and intent remain unknown.

Generic YAMNet scream/shattering candidates use a 0.7 model-score threshold and a fixed context cue of 40; they request Ambiguous review, never an automatic emergency override. Approximate 0.975-second windows and model provenance are retained. Original audio is deleted under the default policy, so these are uncorroborated sound hypotheses until independently verified with authorized evidence.

## Summary discipline

There is no generative LLM in the factual-summary path. The summary enumerates actual database rows and references. An optional OpenRouter reading guide selects existing excerpts and fixed review checks after an explicit preview and consent; generated facts are rejected. Its default NVIDIA endpoint permits synthetic scenarios only. Selection can still omit context, so it is not an endorsed conclusion or a substitute for complete evidence review. Transcript text is either local ASR output or an explicit authored demo script. Human conclusions remain attributed review records. Synthetic title-card videos provide a working time axis but do not substantiate the scripted interaction itself; every investigation screen discloses this.

The optional [Qwen/Ollama experiment](OLLAMA_EVALUATION.md) uses only authored synthetic prompts outside the application. Schema and exact-quotation checks cannot prove that generated interpretations are supported. Its output is not case evidence, a risk signal or an approved report.

## Not implemented / not validated

- Domain-trained money-rubbing, aggression, blocking, proximity, firearm/weapon-use, injury and accident detection. Generic pretrained hand shapes/pose geometry and knife/scissors candidates now run; local-domain validation of every model remains outstanding.
- Officer/citizen identity inference, tone/volume understanding and semantic intent classification. Anonymous diarization now runs locally; estimates are recording-specific and unvalidated on the target domain.
- Urdu-to-Roman-Urdu transliteration and reliable mixed-language ASR benchmarking.
- Learned/calibrated multimodal risk models, retrieval-augmented answer generation and free-form LLM factual summaries. Local multilingual vector retrieval now returns exact evidence excerpts without generating answers; the optional cloud reading guide only selects existing sources.
- Precise action boundaries and guaranteed privacy recall. Configured visual flags select an approximate window's blurred frame/excerpt; otherwise these cover the opening. A selective face-masked video exists but requires human privacy approval; other identifying details may remain.
- Real-time multi-camera/CCTV streaming, body-camera hardware, offline synchronization and live dispatch.

## Evaluation procedure

The [evaluation harness](EVALUATION.md) now implements reproducible metrics and source checks. Its 50-slot collection plan has **zero recorded clips**; it must not be presented as completed research. The following protocol still requires real authorized references.

1. Obtain written informed consent and institutional authorization. Separate actor recordings from real-world data.
2. Split by actor/session/site to avoid train/test leakage. Keep ambiguous examples and false positives in the held-out set.
3. Have at least two trained human annotators label segment timestamps, quoted text, observable actions, uncertainty and expected review routing. Resolve disagreements separately.
4. Run a frozen model/rule/policy version. Save predictions, confidence fields, timing, missing modalities and artifact checksums.
5. Compute WER for transcription; event-level precision/recall/F1 with a declared timestamp tolerance; category confusion matrix; false positives/negatives; missing-evidence and reviewer-agreement rates.
6. Stratify by consented annotation dimensions and acquisition conditions. Report sample counts and uncertainty, including unsupported modalities.
7. Measure wall-clock processing and alert latency on named hardware. Exclude authored seed fixtures. Dashboard processing averages describe actual completed uploads only and are not model-quality benchmarks.

Dataset links were supplied in the PRD and later conversation. Their actual video files have not been downloaded, curated or evaluated in this workspace. The user completed an eight-epoch Kaggle run and supplied the export; exported record consistency and local integration were verified as documented in MODEL_EVALUATION.md. The PRD's target metrics have not been measured or achieved by assertion; synthetic smoke-test metrics are not evidence of detector quality.
