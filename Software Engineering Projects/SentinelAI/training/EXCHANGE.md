# Train and evaluate visual object transfers

This research path is separate from the installed RWF fight model. It uses only
RGB images, a frozen MobileNet V3 Small image encoder and a learned GRU over eight
ordered frames. No speech, transcript, depth, motion-capture coordinates or voice
context is an input. Published motion-capture **phase labels** supervise Cornell
examples; they are not model input. The image encoder alone is not a transfer
detector, and the learned transfer score is not a calibrated probability.

## Sources and terms

- **SBU Kinect Interaction v2, clean subset**: research-only use, credited to
  Kiwon Yun, Jean Honorio, Debaleena Chattopadhyay, Tamara L. Berg and Dimitris
  Samaras, HAU3D-CVPRW 2012. [Publisher documentation](http://vision.cs.stonybrook.edu/~kiwon/Datasets/SBU_Kinect_Interactions/README.txt).
  Downloaded RGB images only are extracted. The publisher supplies HTTP links;
  received bytes have local SHA-256 records, not publisher-authenticated hashes.
  Do not redistribute or deploy commercially based on these research terms.
- **Dataset of Bimanual Human-to-Human Object Handovers**: Alap Kshirsagar,
  Raphael Fortuna, Zhiming Xie and Guy Hoffman, [Zenodo record](https://zenodo.org/records/7767535),
  CC BY 4.0. RGB videos, phase annotation CSVs and readme only; no depth or body
  measurements are needed. ZIP byte ranges, CRC checks and local SHA-256 receipts
  make this download much smaller than the complete 8.9 GB archive.
- **Image encoder**: official Torchvision MobileNet V3 Small ImageNet1K V1,
  `https://download.pytorch.org/models/mobilenet_v3_small-047dcff4.pth`.
  The official filename hash prefix is checked by Torchvision. Runtime bundles
  include the exact extracted encoder weights and full SHA-256.

The four Mixkit controls in `evaluation/visual-controls/` remain evaluation-only.
No stock clip is included in training or threshold selection. They are ordinary
staged interactions, not evidence of bribery by their performers.

The completed first experiment is recorded in
[measured results](../docs/EXCHANGE_MODEL_EVALUATION.md): it learned transfers but
failed the negative-control screening. Its failed results are preserved.
The [follow-up protocol](../docs/VISUAL_TRAINING_V2_PLAN.md) adds selected ordinary
activities from the **CAP detection handheld public validation collection**,
CC BY 4.0, credited to Jeffrey Byrne, Greg Castanon, Zhongheng Li and Gil Ettinger,
WACV 2023; Visym Labs. [Official source](https://visym.github.io/cap/).
This is an FYP adaptation experiment, not a CAP challenge score. The bounded,
resumable downloader verifies the publisher's MD5 for the 901,869,561-byte archive
and records SHA-256. Original videos and annotation JSON stay in ignored local
storage; identifying annotation metadata is excluded from training inventories.

## Reproduce on the CPU

Use the project's Python 3.11 environment and install
`requirements-exchange-training.txt`. Downloads are explicit commands:

```powershell
python -m training.exchange_sources --source sbu --destination .local/datasets/exchange/sbu
python -m training.exchange_sources --source cornell --destination .local/datasets/exchange/cornell
```

The source manifests record selected files, bytes, hashes and completion. A
partial download cannot be silently used as the complete dataset. Existing
verified files are reused. The extractor rejects unsafe paths and oversized
members, and never executes downloaded content.

To prepare the official encoder once:

```python
from pathlib import Path
import torch
from torchvision.models import MobileNet_V3_Small_Weights
from sentinel_ml.exchange import Encoder

folder = Path('.local/models/exchange-pretrain')
folder.mkdir(parents=True, exist_ok=True)
torch.hub.set_dir(str(folder))
model = Encoder(MobileNet_V3_Small_Weights.IMAGENET1K_V1).eval()
torch.save(model.state_dict(), folder / 'encoder.pt')
```

Then run:

```powershell
python -m training.train_exchange --dataset .local/datasets/exchange --encoder .local/models/exchange-pretrain/encoder.pt --cache .local/exchange-features --output .local/models/exchange-mnv3-gru-v1
python -m training.evaluate_learned_exchange --bundle .local/models/exchange-mnv3-gru-v1 --output .local/exchange-research/external-v1.json
python -m pytest tests/test_exchange_training.py -o addopts= -q
```

To reproduce the second protocol (new output folder required):

```powershell
python -m training.cap_controls --destination .local/datasets/exchange/cap
python -m training.train_exchange --dataset .local/datasets/exchange --encoder .local/models/exchange-pretrain/encoder.pt --cache .local/exchange-features --inventory .local/models/exchange-mnv3-gru-v1/inventory.json --output .local/models/exchange-v2-new --version exchange-mnv3-gru-v2 --cap-hard-negatives --static-negative-fraction .25
```

The `--inventory` argument verifies and resumes the saved first experiment's
source inventory; point it at that run's actual folder. It reuses cached features
without overwriting weights or results. CAP's collector/subject groups stay
together. Only allowlisted annotated non-transfer intervals are used; unannotated
footage is not declared safe. Samples record eight explicit frame indexes at an
approximately 4 Hz cadence inside the annotations and container boundaries.
Short intervals are excluded and timing margins are recorded in code. CAP adds
no transfer positives, so its test measures specificity, not recall.

For 25% of training samples, a chosen frame embedding is repeated eight times to
make a synthetic stationary negative. This augmentation is never described as a
real recorded negative. Development selection averages F1 for SBU/Cornell and
specificity for CAP. The reused SBU/Cornell and stock tests are no longer fresh
independent evaluations after experiment 1.

Use a new output directory for a new experiment; previous results are never
overwritten. The feature cache is keyed by source identity, annotation window,
preprocessing and encoder hash. Features use eight ordered RGB frames with a
160-pixel letterbox. Horizontal flipping applies to the entire sequence.

## Split and evaluation protocol

SBU train participants: **01, 02, 07**; development: **03, 05**; test: **04, 06**.
Only the nine pairs wholly inside these sets are downloaded. Opposite roles stay
in the same partition. Class **07** is exchange; **05** is handshake. The mapping
was visually checked rather than inferred from the order of an online list.

Cornell participant pairs P07/P08 through P21/P22 train, P23/P24 and P25/P26
development, P27/P28 and P29/P30 test. Both camera views and giver directions stay
together. Corrupt recordings and RGB/annotation duration disagreements greater
than 0.5 seconds are excluded with reasons. Transfer context is positive;
reach/retreat intervals at least 0.15 seconds away from annotated contact supply
negatives. Valid intervals are at least 0.4 seconds long. Clips are uniformly
resampled to eight ordered frames; shorter clips therefore differ from a live
two-second window. SBU's central 30 frames use its published 15 Hz capture
cadence; its class labels do not establish precise event boundaries.

Train with two CPU threads. The head uses balanced dataset/class sampling.
Checkpoint/threshold selection maximizes mean **development** F1 across the two
datasets, so many Cornell windows cannot hide SBU failure. The fixed threshold
grid runs from 0.10 to 0.95 in steps of 0.025. Training stops after 12 epochs
without an improvement, up to 80 epochs. Held-out predictions run only after
the checkpoint and threshold are fixed. Reports include every prediction,
per-dataset and per-category confusion matrices, source inventory and exclusions.

Runtime research evaluation uses eight consecutive samples at 4 Hz, preserves
their actual timestamps and resets after gaps greater than 0.4 seconds. There
are no invented action boxes. The latency reported per sample includes image
embedding and the temporal head, while clip wall time also includes decoding.

## Deployment boundary

The [third experiment](../docs/VISUAL_TRAINING_V3_PLAN.md) keeps all 120
UT-Interaction recordings in training (119 valid temporal windows, one too
short). It cannot leak its actors into a supposed independent UT test. These
publisher-trimmed handshake/point/hug/push/kick/punch actions are negatives for
object transfer only. Citation: M. S. Ryoo and J. K. Aggarwal, ICPR SDHA 2010;
[publisher downloads and citation requirement](https://cvrc.ece.utexas.edu/SDHA2010/Human_Interaction.html).
Local educational research only; no commercial or redistribution license is
asserted. ZIP CRC, size checks and per-recording SHA-256 receipts are retained.

```powershell
python -m training.ut_controls --destination .local/datasets/exchange/ut
python -m training.train_exchange --dataset .local/datasets/exchange --encoder .local/models/exchange-pretrain/encoder.pt --cache .local/exchange-features --inventory .local/models/exchange-mnv3-gru-v2-upright-20261110/inventory.json --output .local/models/exchange-v3-new --version exchange-mnv3-gru-v3-ut --ut-hard-negatives --static-negative-fraction .25
```

The optional [stronger-feature protocol](../docs/VISUAL_TRAINING_V4_PLAN.md) has a
separate dependency file, `requirements-exchange-dino.txt`. Its DINOv2 Small
encoder comes from the official Meta account, with a pinned revision and
safetensors checksum. It loads only known architecture code from the installed
library. It does not restore speech recognition or use a language model.

```powershell
python -m pip install -r requirements-exchange-dino.txt
python -m training.dino_pretrain --destination .local/models/exchange-dino-pretrain
```

This command measures synthetic-tensor speed and memory only; it does not train
a transfer classifier. A `--backbone dinov2-small-gru-v1` training run uses its
own contract, weights and feature cache. It cannot mix the 768-dimensional DINO
features with the older 576-dimensional MobileNet head. No DINO research model
is automatically loaded by the application.

The current CPU run can be reproduced in a **new** output folder with:

```powershell
python -m training.train_exchange --dataset .local/datasets/exchange --encoder .local/models/exchange-dino-pretrain/encoder.pt --cache .local/exchange-dino-features --inventory .local/models/exchange-mnv3-gru-v3-ut-20261111/inventory.json --output .local/models/exchange-dino-new --version exchange-dino-gru-v4 --backbone dinov2-small-gru-v1 --static-negative-fraction .25
```

If extraction is interrupted, reuse its feature cache and verified inventory
with a new empty output folder. Completed cached features are reused; partial
`.part` files are not counted as completed features. Never start a duplicate job
while the first is still running. No trained checkpoint exists before fitting
has actually completed. `training.complete_exchange_run` can monitor a specific
PID **and creation time** and automatically perform frozen-model evaluation and
screening. Its state records interruption, timeout or failed screening distinctly;
it never changes the application's model configuration.

## Activation checks

The native DINOv2/GRU detector is now explicitly installed for FYP review. Read
[the13November integration note](../docs/LEARNED_EXCHANGE_INTEGRATION.md) for the
selected directory, exact receipts, commands and current combined-stream result.
Original trained weights, threshold0.60 and preprocessing are unchanged. Native
reserved scores are reused exactly; the numerically changed INT8 runtime was
separately evaluated on all460 rows and remains unselected after speed failures.

`training.register_native_exchange` binds original predictions to the frozen
inventory and hash-verified report. `training.screen_exchange_runtime` requires
three distinct complete timing/control runs, per-source precision/recall gates,
CAP negative specificity and p95 below250ms in every round. A converted runtime
cannot inherit native evaluation. `backend.exchange_import --activate` copies
and verifies the complete trusted-local installation before selecting it.
A bare research bundle or edited `deployment_approved` flag remains rejected.

Preserve all failed measurements. Passing these project screening gates allows
local integration and human review; it is not field certification. Reused
laboratory data/four stock controls, action-onset localization, continuous false
alarms/hour, cash identification and real-phone performance remain distinct
limitations. Never tune thresholds against test outcomes or present ordinary
transfers as confirmed misconduct. Android retesting stays last.
