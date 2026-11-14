# Frozen stronger-feature experiment — 11 November 2026

The third MobileNet/GRU experiment still flags the handshake and reduces SBU
recall to 2/4. Repeated small-dataset improvements do not solve representation
or domain coverage. Preserve all previous failures; do not tune on stock scores.

Before fitting, use this single follow-up experiment:

- Replace only the frozen RGB feature encoder with Meta's **DINOv2 Small**:
  https://huggingface.co/facebook/dinov2-small , revision
  `ed25f3a31f01632728cabb09d1542f84ab7b0056`, Apache-2.0. Credit Oquab et al.,
  *DINOv2: Learning Robust Visual Features without Supervision*, 2023. The
  safetensors checksum is pinned in `training/dino_pretrain.py`; no remote model
  code is executed and no runtime download is allowed.
- Letterbox RGB to 224 pixels using the existing ImageNet normalization. Join
  the 384-dimensional CLS token with the mean of 384-dimensional patch tokens.
  This is a **feature encoder**, not a pretrained transfer or currency detector.
- Retain eight ordered frames, source partitions, all 2,460 V3 inventory rows,
  static-negative fraction .25, balancing, optimizer, seed 42, GRU width,
  early stopping and development-only threshold selection. The head's input
  dimension changes to 768; no box/intent/audio output is added.
- Benchmark first on synthetic tensors with two CPU threads. Do not fit if a
  single-frame p95 exceeds 250 ms or the process uses over 2 GB resident memory.
  This preliminary test excludes decoding and simultaneous violence inference;
  any acceptable model still needs the existing streaming integration tests.
- Cache new features using the new contract and encoder hash. Do not reuse
  MobileNet embeddings as DINO features. Writes finish atomically so interrupted
  extraction can resume without a partial cache file masquerading as complete.
- Apply the unchanged screening gates. All existing datasets and four stock
  controls have been inspected before; the resulting evaluations are **reused**.
  No fresh independent generalization claim is permitted. A successful screening
  result only permits further testing, not a claim of reliable bribery detection.

The laptop's fight model and active visual rules remain unchanged. Physical
Android testing remains postponed. Failed checkpoints are not auto-installed.
