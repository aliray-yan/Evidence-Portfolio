# YOLO suitability for SentinelAI

Checked 4 November 2026 against the official Ultralytics documentation and the actual laptop.

**Recommended candidate: YOLO26n detection**, as an optional low-frequency source of person/object boxes. The current R3D-18 model should remain the temporal fight classifier, and audio analysis has now been removed under the revised vision-only scope. A person box must never be relabeled as a “violent person” merely because a clip classifier raised a concern somewhere in that five-second scene.

YOLO26n-pose is a separate candidate for body keypoints. Neither standard COCO checkpoint provides a bribery-intent, conversation, firearms or temporal violence class. Custom spatial/action labels and independent evaluation would be needed for those claims. Existing COCO classes include person and knife; object presence is not weapon use or misconduct.

## Actual local feasibility check

The official `yolo26n.pt` release was downloaded and checked against the SHA-256 digest published in the GitHub release asset metadata. Provenance is stored in `.local/models/yolo26n-evaluation/source.json`. The 4 November feasibility check did not activate it. On 5 November it was selected for experimental person/hand visual-transfer analysis; see [current evaluation](VISION_ONLY.md). No video was uploaded, and inference-time downloads and vendor telemetry were disabled.

Using the already installed Ultralytics 8.4.153, CPU PyTorch with two threads, 320-pixel input and seven authorized frames from the user's `sample_1.mp4`, repeated three times after warm-up:

| Measurement | Observed result |
| --- | --- |
| Prediction calls | 21 |
| Median full prediction time | 41.14 ms |
| 95th percentile | 81.01 ms |
| Evaluation process resident memory | 398.4 MiB |
| Person hypotheses | Present on six of seven sampled frames; zero on the final sample |

These timings exclude initialization and are **not** a sustained-stream result or accuracy/recall measurement. No hand-labeled object ground truth was used. Memory is the standalone evaluation process, not an estimate of incremental application memory. Smaller inputs may miss distant or small objects. ONNX/OpenVINO have not been benchmarked here.

The current live integration samples person/hands at 2 fps in a bounded independent queue alongside R3D-18. Original RTP is retained for each box. Combined sustained measurements and limits are in [live verification](LIVE_VERIFICATION.md).

Reproduce the independent evaluation:

```powershell
python -m backend.evaluate_yolo --download
python -m backend.evaluate_yolo --video 'C:/path/to/authorized/video.mp4'
```

The complete output is `.local/ai-verification/yolo26n-feasibility.json`; it includes normalized coordinates, model confidence and exact sampled video times. This helper does not activate a model, add a false violence label or change the project's license.

Ultralytics offers AGPL-3.0 and Enterprise terms. Review the relevant terms before distribution or deployment; evaluation here is not a licensing decision for the project. [Official licensing](https://www.ultralytics.com/license).

Sources: [YOLO26 models](https://docs.ultralytics.com/models/yolo26), [pose estimation](https://docs.ultralytics.com/tasks/pose), [COCO class list](https://docs.ultralytics.com/datasets/detect/coco), [benchmarking guidance](https://docs.ultralytics.com/modes/benchmark).
