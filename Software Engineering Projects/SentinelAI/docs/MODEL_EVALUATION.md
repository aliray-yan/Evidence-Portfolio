# Imported RWF research model — 30 October 2026

The user supplied `sentinel-rwf-r3d18-v1.zip` and the notebook used to train it. The notebook was inspected as data, not executed locally. Its embedded training/inference modules matched the project's reviewed contract at import. The export is now installed in the ignored local folder `.local/models/rwf-r3d18-v1-7d13c9d32165`; weights and source footage are not committed to Git.

## Recomputed exported results

These numbers were recomputed locally from all 400 saved held-out predictions and checked against the manifest. They are **clip-level results on a curated RWF subset**, not accuracy on police interactions, a finding of guilt, or an independent rerun of the original dataset.

| Measure | Value |
| --- | --- |
| Accuracy | 85.25% |
| Fight precision | 82.79% |
| Fight recall | 89.00% |
| Fight F1 | 85.78% |
| Decision threshold | 0.92, chosen on development F1; uncalibrated score |
| Test set | 400 clips: 200 nonfight, 200 fight |
| Confusion matrix | TN 163, FP 37, FN 22, TP 178 |
| Training / development | 1,271 / 318 clips |
| Training | 8 epochs, Kinetics-400 R3D-18 transfer learning, Tesla T4 |
| Reported training duration | 2,962.615 seconds, from the supplied manifest |

The preparation report starts with 2,000 files and retains 1,989. Eleven exact duplicates were excluded, including six training copies that overlapped the held-out set. All 1,989 exported hashes are unique. Curation references, split counts, group boundaries, split/report checksums and the tensor-weight checksum passed local verification. Source grouping was **not** supplied; exact hashes do not establish independence from reencoded footage or related camera scenes.

## Local application verification

- Loaded the actual trained weights using `weights_only=True` into the fixed two-class R3D-18 architecture. All parameters were finite; a synthetic zero-tensor forward pass returned finite two-class output.
- Submitted a generated one-second test-pattern MP4 through the resumable API in an isolated test database, completed the real media pipeline and read the case back.
- Persisted model version/hash, threshold and one window from 0–1 seconds. The model score on that artificial input was 0.098937. This input is not a behavioral example and establishes no accuracy claim.
- Confirmed encrypted storage, full-frame blurred review video, frame and excerpt, and partial analysis with missing modalities disclosed. Local inference elapsed time for this one run was 1.457 seconds; it is not a latency benchmark.
- The local check is saved in `.local/trained-bundle-check-4tg3zugm/verification.json`. The installed bundle contains `local-verification.json` and a copy/hash of the supplied notebook.

Weights SHA-256: `7d13c9d32165e2bcb8e778e64bc7db30fb519614a579cec9bf50ea0fc10eef50`.

ZIP SHA-256: `c1d6bfef1520a2619d5e2fa0b6751ecbdf120fcd70b8d7258ec30d256b1eab32`.

## Activation and remaining work

`python -m backend.model_import PATH_TO_EXPORT.zip --activate` validates the bounded archive, provenance, reproduced metrics and tensor inference before selecting it for future server starts. Only the six expected flat archive members are accepted. Paths, extra members, symbolic links and oversized members are rejected. Trust remains necessary: record consistency does not authenticate the original dataset or who trained the model.

`.local/model-selection.json` holds the local selection. `SENTINEL_VIOLENCE_MODEL` takes precedence, including an explicit empty value to disable inference. Restart the backend after changing the selection. A startup audit event records changes in the configured model version/hash. Historical cases are not rescored automatically.

Still required: consented Pakistani/mobile-domain evaluation, near-duplicate/source review, error analysis and calibration. This model has no audio, language, gesture, weapon, identity or bribery capability. Above-threshold windows request human review; they do not by themselves dispatch emergency services or establish misconduct.
