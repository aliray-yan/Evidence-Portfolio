# SentinelAI model training

The user-supplied Kaggle fight/nonfight model is installed; its locally verified results are documented in [MODEL_EVALUATION.md](../docs/MODEL_EVALUATION.md). The revised product uses vision only. This page documents the existing RWF training path; the original RWF training footage was not downloaded here.

The separate [visual object-transfer training path](EXCHANGE.md) uses locally downloaded SBU and Cornell RGB data, participant-separated splits, a CPU-trained temporal head and reserved external controls. It does not learn currency identity or establish bribery. Research bundles cannot be activated merely by editing a manifest.

## 1. Run the prepared Kaggle notebook

Upload `SentinelAI_RWF2000_Kaggle.ipynb` to a **private** Kaggle notebook. It contains its own Python modules; you do not need to upload this repository. Select a GPU accelerator and enable Internet for the first torchvision pretrained-weight download. The notebook does not install packages or silently substitute random weights if that download fails.

Attach **one** authorized dataset source:

- Original PRD link: [vulamnguyen/rwf2000](https://www.kaggle.com/datasets/vulamnguyen/rwf2000).
- Additional user link: [magicearth25/video-violence-detection-dataset](https://www.kaggle.com/datasets/magicearth25/video-violence-detection-dataset). Public Kaggle metadata inspected on October 30, 2026 reports 14,241,115,985 bytes and license **Unknown**. A partial file inventory confirmed `Violence Fight Detection dataset/RLVS/train/Fight`, `RLVS/train/NonFight`, `RLVS/val/Fight`, `RLVS/val/NonFight` and `RWF-2000/train/Fight`/`NonFight`. This is a collection containing RWF-2000, not an independent dataset to blindly concatenate with the original RWF download. No video content was downloaded or inspected locally.

The notebook lists discovered subsets and selects exactly one `RWF-2000` root. Set `DATASET_ROOT` explicitly if discovery finds multiple copies. Set `DATASET_NAME` to the source you actually attached; it is preserved in the model manifest. Confirm authorized use with `AUTHORIZED_DATASET=True`, then run all cells. The [RWF authors](https://github.com/mchengny/RWF2000-Video-Database-for-Violence-Detection) currently withhold source downloads for privacy and restrict redistribution/commercial use; check access terms with the source and your supervisor. The collection's Unknown license does not override original-source conditions.

**RLVS is identified but is not silently combined or used in this baseline.** Its source provenance, clip lengths, labels and overlap need inspection first. The loader deliberately stops on clips longer than 5.5 seconds instead of labeling an arbitrary crop as a fight. Longer, weakly labeled clips need reviewed temporal annotations or a separately evaluated multiple-instance training approach. XD-Violence remains the PRD's planned audio-visual component; this smaller visual baseline does not replace it.

After a successful run, download `sentinel-rwf-r3d18-v1.zip` from Kaggle Output. It contains:

| File | Purpose |
| --- | --- |
| `weights.pt` | Tensor-only state dictionary for the fixed R3D-18 architecture |
| `manifest.json` | Labels, exact preprocessing, version, checksum, threshold, training provenance and measured test results |
| `split.json` | File hashes, source groups, labels and train/development/test assignments |
| `history.json` | Actual epoch losses and development results |
| `test_predictions.json` | Per-video held-out labels and scores for verification |
| `curation.json` | Source dataset, unique counts, and every exact duplicate excluded during preparation |

### Recover an existing Kaggle session from the duplicate-content error

If training stopped with `Duplicate content: train/Fight/file_000607.avi and train/Fight/file_000315.avi`, open [Kaggle_duplicate_recovery.py](Kaggle_duplicate_recovery.py) locally and copy its entire contents into a **new Kaggle code cell immediately before the training cell**. Run the new cell, then rerun only the training cell containing `subprocess.run(command, cwd=SOURCE, check=True)`. Do not rerun the old dataset-selection cell afterward: it would point training back at the uncurated source. No GPU/session restart or dataset re-upload is needed.

The recovery cell scans the selected subset and creates links to one representative of each same-label, same-split exact duplicate. It prints progress every 250 files, preserves the original dataset, and logs every exclusion. Rerunning the recovery cell reuses its prepared view and report. The updated preparation keeps held-out copies and excludes matching training copies before development splitting. Conflicting labels or source groups still stop preparation; do not bypass those errors.

Download the additional `sentinel-rwf-r3d18-v1-curation.json` alongside the eventual model ZIP when using the **older trainer** already loaded in your session. The newly generated notebook automatically includes `curation.json` inside its export and records its checksum. The reported duplicate failure occurs before training writes outputs, so its empty output folder can be reused. If a later attempt has already written training files, preserve them and choose a new `VERSION`/`OUTPUT` rather than deleting them.

## 2. What the training actually does

The [torchvision R3D-18](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.video.r3d_18.html) Kinetics-400 backbone supplies pretrained features. The last residual block and replacement binary head are fine-tuned; other parameters and batch-normalization statistics stay frozen. Training defaults to eight epochs, batch size four, AdamW and GPU mixed precision. Actual library versions and GPU identity are recorded in the export. This is an initial baseline, not a claimed optimal architecture.

Shared training/server code samples 16 RGB frames uniformly within each five-second window, resizes to 128×171, crops to 112×112, normalizes and arranges C×T×H×W. Short clips repeat sampled frames. Video inference uses adjacent, nonoverlapping five-second windows and a final shorter window. These approximate window timestamps are not precise action boundaries.

The supplied `val/` (or `test/`) is held out. Twenty percent of the supplied training groups become development data. Best epoch selection uses development F1 at 0.5; the final threshold is chosen on development F1 only, with a higher-threshold tie break. The held-out set is predicted only after selection. Repeatedly tuning after inspecting test results invalidates this holdout.

Before creating the development split, preparation keeps the lexically first file for each exact SHA-256 duplicate **within the same class and original split**. The remaining copies are excluded from a linked working view, not deleted from the source; `curation.json` records their hashes and paths. With the notebook’s explicit `keep_holdout` policy, cross-split duplicates retain the held-out copy and exclude every matching training copy. The report records these overlap exclusions; results must be described as a curated subset. Conflicting labels or source groups still stop preparation. Direct curator calls retain strict rejection unless this policy is selected. The training inventory retains its strict duplicate check as a second guard.

Optional `GROUPS_FILE` maps every source dataset-relative filename, including excluded copies, to its original source/session; groups cannot cross splits. Without that file, splitting is clip-level. Hash checks do not detect reencoded or otherwise modified copies or related camera scenes. Review these manually before reporting benchmark results. Clip-level accuracy/F1 on RWF do not establish event-level accuracy, calibration, fairness or transfer to Pakistani mobile footage.

Training saves best weights each epoch, but **optimizer-state resume is not implemented**. If interrupted, retain the output and start a new version/output directory. Existing output folders are never overwritten. Reduce batch size on out-of-memory errors; do not change preprocessing without changing the server contract as well.

## 3. Install your exported weights locally

Run from the project folder using the same Python environment as the backend:

```powershell
python -m pip install -r requirements-vision.txt
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\sentinel-rwf-r3d18-v1.zip" -DestinationPath '.local\models\violence-v1'
python -m backend.model_check .local/models/violence-v1
$env:SENTINEL_VIOLENCE_MODEL = (Resolve-Path '.local/models/violence-v1').Path
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

For the phone server, set the same variable before `python -m backend.mobile serve` instead. Stop the old server before restarting. The processor caches one model until restart, and records its version/hash/threshold/windows on each case. Import only bundles you trained or otherwise trust. Tensor-only `torch.load(weights_only=True)`, fixed architecture and checksums reduce risk; they do not make an untrusted model safe or authenticate its training provenance. No model is uploaded through the web UI, and weights are not auto-downloaded at inference time.

Optional command-line inference on an authorized file (no case/database writes):

```powershell
python -m backend.model_check .local/models/violence-v1 --video 'C:\path\to\authorized-test.mp4'
```

## 4. Test the complete path

1. With no model configured, upload a new short authorized MP4: expect partial analysis, no invented visual predictions, and Unassessed unless another available signal requires review.
2. Configure a trained bundle, restart, and upload a **new** recording. Previously processed originals were deleted, so the server cannot run the model on them again.
3. Check the Video analysis stage. Above-threshold windows create model-labeled events with timestamps, an uncalibrated model score and evidence links. The strongest flagged window receives a blurred screenshot and surrounding excerpt; all events link to the protected full video.
4. Check the JSON report's `assessment.vision`: version, hash, threshold, all window scores and measured inference duration. A negative result does **not** clear other unsupported modalities.
5. A positive visual cue creates an **Ambiguous local review alert**, not an automatic emergency dispatch. Confirm/dismiss or escalate with a rationale as an authorized reviewer. No one is identified as an aggressor or guilty by this model.
6. With an invalid/missing configured bundle, a new upload must fail at video analysis and retain its encrypted source for retry. Repair the path/weights, restart and retry before quarantine retention deletes the source.

For physical mobile transfer, follow [the phone test](../docs/MOBILE_TEST.md).

## Reproduce development checks

```powershell
python -m pytest -o addopts='' -q
python -m training.build_notebook
python -m training.smoke --directory .local/training-smoke-new
```

The smoke command performs an actual CPU training step, evaluation and export using generated random-color clips. Its bundle is marked **test_only** and the server rejects it. Its metrics are meaningless for detection quality. No smoke artifact is installed as a model. The notebook code cells and embedded source synchronization are tested locally; a full Kaggle execution with authorized footage/GPU still must be performed in your account.
