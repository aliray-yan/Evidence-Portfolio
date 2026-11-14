# Learned visual-transfer experiments — 11 November 2026

> **13 November update:** native DINOv2/GRU passed three actual-video CPU runs after bounded sequential decoding (p95 147.67/147.30/141.61ms) with all predictions identical. It is now selected for local review. INT8 also completed calibration and all460 reserved windows but failed CPU timing. See [current installation, verification and limits](LEARNED_EXCHANGE_INTEGRATION.md). The earlier rejected/disabled conclusions below are dated experiment history, not the current native selection.

These are measured research results for observable object transfers, not bribery,
currency identity, intent or guilt. No audio is used. The installed application's
original experimental rules remain separate; a failed learned model is not
automatically installed.

## Experiment 1: completed, rejected for activation

Bundle: `.local/models/exchange-mnv3-gru-v1-20261110`.
Machine-readable verdict: [screening report](../evaluation/visual-training/screening-20261110.json).
The bundle retains the complete source inventory, exclusions, training history,
development selection, held-out predictions, encoder/head weights and checksums.

Frozen official MobileNet V3 Small RGB features feed a learned eight-frame GRU.
There are 1,355 training, 375 development and 370 test windows, with participant
groups separated before fitting. Both camera views of a Cornell recording stay
together. Forty-three unreadable Cornell videos are excluded. SBU has 126 selected
sequences; the remaining records are Cornell phase windows, not independent
recordings. See [protocol and sources](VISUAL_TRAINING_PLAN.md).

Training ran for 17 epochs with early stopping. Development selected epoch 5 and
threshold **0.425**. The resumed run took 369.919 seconds including remaining
feature preparation; this excludes preparation done before the interruption.
This is not a benchmark for a fresh complete training run.

| Reserved evaluation | True transfers detected | False positives | Precision | Recall |
| --- | --- | --- | --- | --- |
| Cornell, 342 windows | 107 / 120 | 13 / 222 non-transfer windows | 89.17% | 89.17% |
| SBU, 28 sequences | 4 / 4 | 2 / 24 non-transfer sequences | 66.67% | 100% |

The SBU false positives were one handshake and one push. Only four SBU test
positives exist, so the recall estimate is highly uncertain. Cornell windows and
camera views are correlated. These percentages do not estimate field accuracy.

The four source-locked Mixkit controls were never included in training or
threshold selection. Each test counts any flagged window as a clip detection;
it does not measure precise transfer onset or spatial localization.

| Control | Expected visible transfer | Model flagged it | Outcome |
| --- | --- | --- | --- |
| Cash handover | Yes | Yes | Detected |
| Ordinary envelope handover | Yes | Yes | Detected; not evidence of bribery |
| Handshake | No | Yes | False positive |
| Ordinary conversation | No | Yes | False positive |

The per-sample inference 95th percentile was **36.73 ms**, using nearest rank over
138 scored windows. This includes RGB embedding and temporal-head computation,
but excludes video decoding, startup, WebRTC and concurrent violence inference.
The full control wall times, including decoding, were 3.866, 7.355, 4.663 and
15.424 seconds respectively. These are local measurements, not sustained-live
performance guarantees.

**Verdict: do not activate.** The model fails the predeclared SBU precision and
two external negative-control checks. Flagging both money and envelopes does not
make the detector reliable when it also flags ordinary interactions.

## Experiment 2: upright retraining completed, rejected for activation

Bundle: `.local/models/exchange-mnv3-gru-v2-upright-20261110`.
Machine-readable verdict: [second screening report](../evaluation/visual-training/screening-v2-upright-20261110.json).
CAP supplies 241 additional negative windows: 124 training, 27 development and
90 test. The resulting inventory has 2,341 windows. One quarter of training
samples use explicitly synthetic stationary-sequence augmentation. Training ran
30 epochs; development selected epoch 18 and threshold **0.85**. The run took
222.559 seconds including feature preparation, with previously cached features.

| Reused evaluation | True transfers detected | False positives | Precision | Recall |
| --- | --- | --- | --- | --- |
| Cornell, 342 windows | 110 / 120 | 9 / 222 non-transfer windows | 92.44% | 91.67% |
| SBU, 28 sequences | 3 / 4 | 1 / 24 non-transfer sequences | 75% | 75% |
| CAP, 90 negative windows | No positives in this set | 0 / 90 | Not applicable | Not applicable |

| Reused stock control | Model flagged it | Outcome |
| --- | --- | --- |
| Cash handover | Yes | Transfer detected; currency not identified by the model |
| Ordinary envelope handover | Yes | Transfer detected; no bribery conclusion |
| Handshake | Yes | False positive |
| Ordinary conversation | No | Correct negative on this single clip |

**Verdict: do not activate.** SBU precision and the handshake control still fail.
The improved Cornell result must not be advertised as overall bribery accuracy.
Stock evaluation ran alongside software checks, so its timings are not an
isolated hardware benchmark. Detailed timing and source hashes are in the report.

Two data-preparation attempts produced no fitted model. A first completed CAP
run (`v2c`) was discarded after visual inspection revealed ignored rotation
metadata in 26 of 47 source recordings. Its bundle contains a discard marker and
the loader refuses it. The upright run explicitly honors rotation and uses new
cache identities. CAP test outputs had already been inspected in the discarded
run; these corrected results are **reused**, not fresh independent evaluation.
The video-rotation regression test now creates actual display metadata using
FFmpeg's input `-display_rotation` option; the old fixture's `rotate` tag was
ignored by the installed FFmpeg. All 30 training/inference safeguards passed
after this correction and the UT training-only guard addition.

## Experiment 3: additional handshake training, rejected for activation

Bundle: `.local/models/exchange-mnv3-gru-v3-ut-20261111`.
[Third screening report](../evaluation/visual-training/screening-v3-ut-20261111.json).
Added 119 valid UT training windows; the inventory now has 2,460 windows.
All UT recordings stay in training, avoiding an unsupported actor-independence
claim. Training ran 47 epochs and selected epoch 35, threshold **0.575**, on
development. Elapsed time was 129.762 seconds with previously cached features.

| Reused evaluation | True transfers detected | False positives | Precision | Recall |
| --- | --- | --- | --- | --- |
| Cornell, 342 windows | 110 / 120 | 8 / 222 non-transfer windows | 93.22% | 91.67% |
| SBU, 28 sequences | 2 / 4 | 1 / 24 non-transfer sequences | 66.67% | 50% |
| CAP, 90 negative windows | No positives in this set | 0 / 90 | Not applicable | Not applicable |

The cash and envelope controls were flagged, the conversation control was not,
and the handshake was still a false positive. Per-scored-sample inference p95
was 37.39 ms, excluding decoding, startup and simultaneous violence inference.
**Verdict: do not activate.** SBU recall regressed; more training data alone did
not fix this encoder's generalization. These are retained failed measurements,
not a new independent benchmark or evidence of guilt.

## Experiment 4: DINO training complete, detection checks passed, speed check failed

The [fourth protocol](VISUAL_TRAINING_V4_PLAN.md) uses frozen DINOv2 Small RGB
features with the same 2,460 records and development-only selection. The
official 88,249,960-byte checkpoint and SHA-256 were verified. No remote Python
was executed. Its features do not identify currency or determine misconduct.

Initial synthetic-tensor benchmark: two CPU threads, five warmups, 20 measured
single frames at 224 pixels; median **183.54 ms**, nearest-rank p95 **210.08 ms**,
eight-frame batch **1.436 seconds**, process RSS after that batch **502.8 MB**.
These figures are preliminary and exclude decoding, streaming and concurrent
fight inference. Dynamic INT8 was slower (p95 359.53 ms); ONNX was also slower
(p95 255.59 ms), so neither acceleration path was selected. ONNX numerical
agreement was checked on batches of one and eight, maximum absolute differences
0.00001944 and 0.00004125. These are numerical checks, not model accuracy.

The first CPU run stopped during laptop shutdown with 285 complete feature files
and no trained head. Those finite, correctly shaped caches were verified and
reused. The resumed run completed all 2,460 windows and 16 epochs on 11 November;
development selected **epoch 4 and threshold 0.60**. Recorded resumed-run time
was **5,683.73 seconds (94.73 minutes)**, including remaining feature preparation,
fitting and internal evaluation. It excludes work completed before shutdown and
the subsequent stock-control evaluation.

Bundle: `.local/models/exchange-dino-gru-v4-resume1-20261111`.
[Completed screening report](../evaluation/visual-training/screening-v4-dino-resume1-20261111.json).
Log: `.local/exchange-research/training-v4-dino-resume1-20261111.log`.
The automatic monitor completed at **14:50 Pakistan time** and did not activate
the model. Training and its evaluation no longer need the laptop kept awake.

| Reused evaluation | True transfers detected | False positives | Precision | Recall |
| --- | --- | --- | --- | --- |
| Cornell, 342 windows | 112 / 120 | 10 / 222 non-transfer windows | 91.80% | 93.33% |
| SBU, 28 sequences | 3 / 4 | 0 / 24 non-transfer sequences | 100% | 75% |
| CAP, 90 negative windows | No positives in this set | 0 / 90 | Not applicable | Not applicable |

| Reused stock control | Model flagged it | Result |
| --- | --- | --- |
| Cash handover | Yes | Observable transfer detected; no currency/illegality classification |
| Envelope handover | Yes | Ordinary transfer detected; not proof of bribery |
| Handshake | No | This known false-positive control now passes |
| Normal conversation | No | This control passes |

All nine predeclared **detection** checks passed. The performance check failed:
nearest-rank per-scored-sample p95 **281.10 ms**, above the unchanged **250 ms**
limit. This timing includes encoder/head computation and excludes decoding,
startup, streaming and concurrent fight inference. Control wall times including
decoding were 6.095, 10.173, 7.922 and 24.199 seconds respectively. A faster
synthetic-tensor feasibility measurement does not override this measured result.

**Verdict: keep disabled; optimize and re-evaluate CPU performance.** Preserve
the frozen weights, preprocessing, source partitions, threshold and failed
screening report. Do not relax the limit or claim the full screening passed.
Independent evaluation and upload/live integration remain required even after
a successful speed check. These reused, small and correlated tests do not
establish reliable field-level bribery detection. SBU recall has only four
positive examples. Existing operational model selections remain unchanged.

## Protocol history

### CPU optimization continuation, 11–12 November

Frozen weights, threshold0.60 and temporal preprocessing remain unchanged.
Two declared thread-benchmark rounds measured two-thread p95 248.55/230.08ms,
one-thread299.28/366.08ms and three-thread209.79/270.00ms. These repeated-frame
microbenchmarks exclude decoding/concurrent fight inference and do not replace
the original failed actual-video measurement.

OpenVINO2025.4.1 FP32 export passed eight real-frame feature comparisons
(maximum absolute difference0.00003171), and all138 control predictions retained
their timestamps/classifications with score differences within0.0001. Its
microbenchmark p95 was244.27ms, but actual-video control p95 was **255.27ms**:
still above250ms. This is a recorded failure, not an activated model. No further
timing rounds were launched after that first failure.

NNCF2.18.0 INT8 tooling is saved and installed, but calibration has **not run**.
No INT8 quality, speed or memory result exists. Changed encoder outputs will
require a runtime-specific rerun of all460 reserved windows and all four controls;
the screening helper rejects runtime-tagged controls with the original held-out
report. The latest protocol, artifacts and verification are in
[the continuation checkpoint](COMPLETION_SESSION.md).

[The second experiment](VISUAL_TRAINING_V2_PLAN.md) adds licensed CAP everyday
activities as hard negatives and stationary-sequence augmentation. Its protocol
was written before fitting. SBU/Cornell and stock controls are already inspected
evaluations; any later results on them must be labeled reused. CAP's reserved
collector/subject groups supply a negative-only check, not transfer recall. The
rotation correction above explains why its final results are also reused.

[The third protocol](VISUAL_TRAINING_V3_PLAN.md) adds the small UT-Interaction
collection entirely to training to address ordinary person-to-person contact.
No stock footage enters fitting and no existing threshold is moved to hide a
test failure. The completed third-run failure is recorded above.

## Source attribution

- SBU Kinect Interaction v2 clean: Kiwon Yun, Jean Honorio, Debaleena Chattopadhyay,
  Tamara L. Berg and Dimitris Samaras, HAU3D-CVPRW 2012. Research-only use;
  [publisher documentation](http://vision.cs.stonybrook.edu/~kiwon/Datasets/SBU_Kinect_Interactions/README.txt).
- Cornell: Alap Kshirsagar, Raphael Fortuna, Zhiming Xie and Guy Hoffman,
  [Dataset of Bimanual Human-to-Human Object Handovers](https://zenodo.org/records/7767535),
  CC BY 4.0. RGB recordings and published phase labels only.
- CAP: Jeffrey Byrne, Greg Castanon, Zhongheng Li and Gil Ettinger,
  *Fine-grained Activities of People Worldwide*, WACV 2023; Visym Labs.
  [Official dataset](https://visym.github.io/cap/), CC BY 4.0, consented participants.
  Downloaded 47 public handheld detection videos and annotations; publisher
  archive MD5 verified. This adaptation is not a CAP challenge submission.
- Video via Mixkit: [individual control pages and licenses](VISION_ONLY.md).
  Evaluation only; no model fitting, redistribution or allegations about actors.
- UT-Interaction: M. S. Ryoo and J. K. Aggarwal, ICPR SDHA 2010;
  [publisher and citation](https://cvrc.ece.utexas.edu/SDHA2010/Human_Interaction.html).
  Downloaded 120 trimmed recordings (about 30 MB of ZIP archives), training-only.
  One short clip is excluded; 119 use eight distinct samples. Public research
  challenge downloads with required citation; no redistribution license claimed.

All source media stays in ignored local research storage. No participant
identity, private metadata or raw research video is copied into operational case
records. Physical Android streaming retesting remains postponed.
