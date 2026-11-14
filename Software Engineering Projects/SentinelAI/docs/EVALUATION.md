# Consented local-domain evaluation

The software evaluation harness is implemented; the PRD's 50 recorded and independently annotated scenarios are **not yet collected**. The [50-slot collection plan](evaluation-collection-plan.json) contains unrecorded briefs with authorization false and no invented media, transcripts, scores or reference labels. Generate another plan with `python -m evaluation.create_plan --output <new-file.json>`.

## Collect and annotate

1. Use consenting adult actors and authorized sites, or existing footage with documented permission for this research purpose. Label reenactments as reenactments. Do not stage actual violence, dangerous weapon use or unauthorized police operations. For positive violence examples, obtain an independently held-out, appropriately authorized source; do not reuse the model's training clips.
2. Allocate independent source/session/actor groups to train, development and test before tuning. Variants of one scene stay in the same group and split. The 50 plan slots span ten scene families and five language/recording conditions; they are not 50 independent groups merely because filenames differ. Include difficult negative and uncertain examples, occlusion and mixed-language speech. Review whether these cover the supervisor's final protocol; they are not a balanced operational sample.
3. Have two annotators independently transcribe exact words, mark observable gesture intervals, and assign review routing with a rationale. Resolve disagreements and retain both originals in restricted research records. Label intent unknown where evidence cannot establish it. Reference routing is an annotation for testing, not a legal judgment.
4. Freeze model weights, phrase-library settings, thresholds and software revision before testing. Record hardware and consent/collection provenance separately from exported reports. Do not tune thresholds on held-out results.

Put recordings under one evaluation folder, with a JSON manifest alongside them. This example is intentionally incomplete until a real authorized recording and checksum exist:

```json
{
  "schema": 1,
  "clips": [{
    "clip_id": "SA-EVAL-001",
    "file": "clips/authorized-recording.mp4",
    "sha256": "REPLACE_WITH_ACTUAL_SHA256",
    "authorized": false,
    "source_group": "REPLACE_WITH_ACTUAL_SOURCE_SESSION",
    "split": "test",
    "reference_transcript": null,
    "review_priority": null,
    "gestures": null,
    "speaker_turns": null,
    "second_reviewer_priority": null
  }]
}
```

Use null for an unannotated modality, never an invented label or empty transcript. An empty gesture list means an annotator confirmed that no supported gesture occurs. Gesture entries are `{"label":"Open palm","start":1.0,"end":2.5}` using the exact observation names shown in the app. `review_priority` uses Normal, Low Risk, Ambiguous, High Risk, Emergency or Unassessed. Record what you actually intend to test: current missing-modality handling can legitimately produce Unassessed even for a routine scene.

## Run

```powershell
.\.local\runtime\Scripts\python.exe -m evaluation.run --manifest .local/evaluation/manifest.json --output .local/evaluation/results-v1.json
```

The harness rejects unconfirmed authorization, missing/hash-mismatched files, paths escaping the evaluation folder, exact duplicate content and source groups crossing splits. It processes only the held-out test rows in a temporary isolated app, using installed models and the shipped phrase/policy defaults. It does not copy policy changes from the live application. It saves per-case model provenance; output files cannot overwrite an earlier report. Temporary processed evidence is removed when the evaluation finishes; keep the authorized source set and separate reference annotations under your research retention policy.

Alternatively pass `--predictions saved-predictions.json` to score previously captured outputs. Each prediction must carry the matching clip ID and source checksum, completed/partial processing status and the actual predicted fields. There must be exactly one prediction per test row. Missing speech or hand/pose analysis for an annotated modality fails rather than being counted as successful negative detection.

## Metrics and limits

The report calculates normalized transcript word/character error rates, review-priority confusion matrix and class precision/recall/F1/false-positive/false-negative rates, maximum-cardinality one-to-one same-label gesture matches at temporal intersection-over-union ≥0.5, and actual recorded processing time. The matcher now avoids greedy reference-order undercounts. Empty denominators are null. No labeled inputs means no quality metric. Urdu/Roman Urdu scripts are not transliterated; compare like scripts or adopt and document a common independent normalization before scoring.

Optional `speaker_turns` entries use `{"speaker":"anonymous A","start":1.0,"end":2.5}`. Annotate speech intervals independently, including overlap; use null when unannotated and [] only when a reviewer confirms no speech. The harness requires actual diarization output for an annotated clip. It optimally maps anonymous predicted clusters to reference speakers with SciPy's linear assignment, then reports missed, false-alarm and confused speaker-seconds and their sum divided by reference speaker-seconds (DER). It uses zero boundary collar, includes overlapping speakers, and counts each speaker's active time; DER can exceed 1. No reference speech gives null DER, with false-alarm seconds still reported. Requirements are included in `requirements-ai.txt`. The metric is a recording-level voice-separation measure, not identity recognition.

For independent review-routing agreement, supply the first annotator's untouched label as `review_priority` and the second as `second_reviewer_priority`. The report calculates observed agreement and unweighted Cohen's kappa only for paired labels. Do not compare a consensus/adjudicated label with one of the annotators and describe that as independent agreement. Kappa is null when its chance-agreement denominator is zero. Keep an adjudicated prediction-quality run separate where needed.

The count flag for 50 clips does not validate independence, balanced coverage or deployment readiness. Near-duplicates and shared actors/sites require manual review beyond exact hashes/group IDs. Independent annotation collection, confidence intervals, calibration, retrieval relevance judgments, face privacy recall, injury/firearm detection and operational dispatch latency need additional protocols and are not manufactured by this harness. Synthetic fixture inference and software tests must be reported separately from real-domain metrics. No local-domain DER, retrieval quality or reviewer-agreement result has been measured yet.

Existing RWF export measurements remain in [MODEL_EVALUATION.md](MODEL_EVALUATION.md). They cannot substitute for this local-domain study.
