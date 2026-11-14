# Local speaker turns and evidence search

> **Historical scope superseded 5 November 2026.** Speech, speaker/sound analysis, phrase/conversation classification and multimodal fusion no longer run. Historical research records below are retained for traceability, not current capabilities or setup instructions. See [current vision-only scope](VISION_ONLY.md). Evidence search remains available.

Implemented and exercised on CPU on 2 November 2026. These components use local pretrained models, not the Kaggle fight classifier or OpenRouter. Physical mobile integration remains on hold.

## Install and activate

Both bundles are already installed and selected on this workstation. For a fresh environment:

```powershell
python -m pip install -r requirements-ai.txt
python -m backend.setup_language_models --download
```

Use `--only diarization` or `--only retrieval` to install one component. Restart the server afterward. Setup preserves existing model selections. Runtime inference never downloads a model. `SENTINEL_DIARIZATION_MODEL` and `SENTINEL_RETRIEVAL_MODEL` override the selected local directories; an explicit empty value disables that component. Startup records model identity changes in the audit log. Historical decisions are not recomputed.

Speaker assets occupy about 34 MB plus the segmentation archive; search assets about 487 MB. Downloads are bounded, atomic and checksummed. The search bundle is pinned to publisher revision `614241f622f53c4eeff9890bdc4f31cfecc418b3` and publisher SHA-256 values. The speaker release initially had no publisher digest: initial retrieval used HTTPS and recorded hashes, and subsequent installation verifies those recorded hashes. Hashes detect changes; they do not independently authenticate a publisher.

Sources and attribution:

- [sherpa-onnx diarization models](https://k2-fsa.github.io/sherpa/onnx/speaker-diarization/models.html): pyannote segmentation 3.0 and converted WeSpeaker ResNet34. Segmentation is MIT; WeSpeaker model attribution/CC-BY-4.0 is recorded in the local manifest, distinct from its Apache-2.0 code. See the [WeSpeaker model card](https://huggingface.co/Wespeaker/wespeaker-voxceleb-resnet34-LM).
- [multilingual E5 small](https://huggingface.co/intfloat/multilingual-e5-small): MIT, 384-dimensional embeddings. The CPU adapter uses the pinned ONNX graph, query/passage prefixes, masked mean pooling and normalization. Tokenizer input is bounded to 512 tokens; overflow fails visibly instead of silently dropping words.

## Speaker behavior

New authorized uploads with audio run anonymous diarization during Audio analysis when the model is configured. The native inference runs in a time-limited child process on temporary 16 kHz mono PCM16 audio. A configured failure stops processing and retains the encrypted original for the existing retry/quarantine policy. Files without audio record that absence. Successful processing still deletes originals and temporary audio under the existing privacy policy.

The timeline stores estimated speaker turns and model provenance. A transcript segment receives an estimated label only when one voice covers at least 80% of it and other voices/overlap cover at most 10%. Otherwise its speaker remains unknown. Quotes are not split or invented. Speaker numbers start over for each recording; they never mean an identified person or officer/citizen role. Voice embeddings are transient and are not stored or searched across cases. Speaker events are excluded from risk fusion and cannot create alerts.

Old processed cases do not gain speaker labels automatically because their protected source audio has already been deleted. A missing label is not a failed identity match. Existing synthetic speaker names remain authored scenario annotations.

## Search behavior and demonstration

1. Open a case you can access and select **Evidence summary**.
2. Under **Search case evidence**, enter words and choose **Exact words**. This needs no model or index.
3. Select **Prepare semantic search** for local meaning search. Actual queued/running/progress/ready/failed states are saved; the page polls them. Media processing takes priority over indexing.
4. When ready, choose **Meaning · multilingual** and search. Each result is an exact stored excerpt with a source identifier and timestamp. **View source** opens the transcript/event tab and seeks the player.
5. Inspect **System health → Evidence search indexes** for failures. After correcting model/runtime files and restarting, use **Retry semantic indexing** in the case summary. A changed source/model requires a new index.

Search covers transcript text and event descriptions for one authorized case, not reviewer notes, identities, locations or a global case collection. Case authorization and CSRF are checked server-side; access and source consistency are rechecked after inference. Search does not contact OpenRouter or generate answers, interpretations or new evidence. Semantic results are the closest available excerpts even when none answers the question. Cosine similarity is a relative ranking, not confidence, calibrated probability, misconduct risk or proof. Urdu/Punjabi and mixed-language quality remain unvalidated; Roman Urdu spelling variants can fail.

Migration 006 stores index jobs and chunk offsets. Vectors are authenticated-encrypted with the evidence storage key; no duplicate excerpt text is stored in the index. Query text is not put in URLs or audit records; the audit uses a keyed digest. Limits: 400 query characters, 20 results, 2,000 sources/4,000 chunks per case, 30 searches per user per minute and ten queued/running index jobs. One local model operation runs at a time; a busy model returns an actionable retry message. Only successful indexing makes meaning search available. Restarted running jobs are queued again. Retention cascades to chunks and prevents an in-flight worker from recreating an erased index. This is logical database deletion, not a forensic-erasure guarantee for backups or disk pages; encrypted host storage remains necessary.

## Reproduce actual model checks

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-synthetic-dialogue.ps1
python -m backend.verify_language --synthetic-dialogue .local/ai-verification/dialogue
```

The first command needs two installed Windows synthetic voices and the normal user's Windows speech runtime. It creates four fictional speech blocks, not recordings of real people. The second runs actual local E5 English/Urdu receipt queries and diarization. Reports go to `.local/ai-verification/language-verification.json`. The observed two clusters on two synthetic voices are a plumbing check, not measured diarization accuracy; block boundaries include silence and are not independent speech annotations.

After the public-fixture/synthetic-speech setup in [LOCAL_AI.md](LOCAL_AI.md), `python -m backend.verify_pipeline` tests all configured components, persisted turns, encrypted semantic indexing, exact excerpts, unchanged risk, privacy access and original deletion in an isolated application. With the normal server running, `node e2e/language-live.mjs` exercises a labeled synthetic case using the actual local search model, desktop/mobile accessibility, seeking and index persistence. It makes no cloud request. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed browser if needed.

The [evaluation harness](EVALUATION.md) accepts independent speaker-turn annotations and calculates overlap-aware diarization error rate. No real-domain speaker metric has been measured yet. Complete retrieval-augmented answer generation, semantic intent classification, voice identity recognition and vocal-tone/emotion inference are not implemented.
