# RETIRED 2026-11-05: historical research regression code only; not imported by application inference.
"""Local ASR with timestamp validation and provenance, without speaker inference."""
import math
import time
import os
from .ai_models import model_identity


def has_audio(path):
    import av
    with av.open(str(path)) as container:
        return bool(container.streams.audio)


class LocalWhisper:
    def __init__(self, model_path, cpu_threads=4):
        os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
        os.environ['HF_HUB_OFFLINE']='1'
        from faster_whisper import WhisperModel
        self.identity = model_identity(model_path)
        self.model = WhisperModel(str(model_path), device="cpu", compute_type="int8", cpu_threads=cpu_threads, local_files_only=True)
        self.last_report = {}

    def transcribe(self, path, beam_size=3):
        started = time.perf_counter()
        import numpy as np
        source=path if isinstance(path,np.ndarray) else str(path)
        if beam_size not in (1,3):raise ValueError('Unsupported transcription search size.')
        segments, info = self.model.transcribe(source, beam_size=beam_size, vad_filter=True,
                                               condition_on_previous_text=False, word_timestamps=False)
        results, warnings = [], []
        for s in segments:
            if not all(math.isfinite(v) for v in (s.start, s.end, s.avg_logprob, s.no_speech_prob)) or not 0 <= s.start < s.end <= info.duration + .25:
                raise ValueError("Speech model returned an invalid segment or timestamp.")
            text = s.text.strip()
            if not text:
                continue
            if len(text) > 4000 or len(results) >= 1000:
                raise ValueError("Speech output exceeded its safety bounds.")
            if s.avg_logprob < -1 or s.no_speech_prob > .5:
                warnings.append({"start": s.start, "end": s.end, "reason": "Low-likelihood ASR segment; verify manually."})
            results.append({"start": s.start, "end": min(s.end, info.duration), "text": text,
                            "language": info.language, "speaker": None, "source": "local_whisper",
                            "uncertain": s.avg_logprob < -1 or s.no_speech_prob > .5})
        self.last_report = {"model": self.identity, "status": "completed", "language": info.language, "beam_size":beam_size,
                            "language_score": round(info.language_probability, 5), "segments": len(results),
                            "duration_seconds": round(info.duration, 3), "warnings": warnings,
                            "elapsed_seconds": round(time.perf_counter()-started, 3),
                            "scope": "ASR hypothesis, not a verified quotation. Language is clip-level. No speaker identification or transliteration. Silence is not evidence of safety."}
        return results
