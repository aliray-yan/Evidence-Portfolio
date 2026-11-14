"""Optional CPU inference for the exact bundle exported by the Kaggle notebook."""
import math
import time
from sentinel_ml.bundle import load_network
from sentinel_ml.video import read_clip, video_info, windows


class LocalViolence:
    def __init__(self, directory):
        import torch
        torch.set_num_threads(min(4, torch.get_num_threads()))
        self.model, self.manifest = load_network(directory)
        self.last_report = {}

    def analyze(self, path):
        import torch
        fps, count = video_info(path)
        started, events, predictions = time.perf_counter(), [], []
        threshold = self.manifest["threshold"]
        with torch.inference_mode():
            for start, end in windows(count / fps):
                logits = self.model(torch.from_numpy(read_clip(path, start, end)).unsqueeze(0))
                if tuple(logits.shape) != (1, 2) or not torch.isfinite(logits).all():
                    raise ValueError("Vision model returned an invalid output.")
                score = float(logits.softmax(dim=1)[0, 1])
                if not math.isfinite(score):
                    raise ValueError("Vision model returned an invalid score.")
                predictions.append({"start": start, "end": end, "score": round(score, 6)})
                if score >= threshold:
                    events.append({"start": start, "end": end, "kind": "visual",
                                   "title": "Possible physical conflict — human review required",
                                   "detail": f"Research model {self.manifest['version']} flagged this sampled {end-start:.1f}-second window. It cannot identify an aggressor, weapon, officer, or misconduct. The score is uncalibrated; inspect context. Precise action boundaries are unknown.",
                                   "confidence": round(score, 6), "source": "model", "references": [],
                                   # Review cue, not a safety override or probability-to-risk conversion.
                                   "signals": {"body": 80, "context": 40}})
        self.last_report = {"version": self.manifest["version"], "sha256": self.manifest["sha256"],
                            "architecture": self.manifest["architecture"], "threshold": threshold,
                            "threshold_source": "development-set F1; uncalibrated", "windows": predictions,
                            "elapsed_seconds": round(time.perf_counter()-started, 3),
                            "scope": "Research fight/nonfight clip classification; no local-domain validation."}
        return events
