"""Transparent rule-based indicators, not a validated misconduct classifier."""
from dataclasses import dataclass
from typing import Protocol
import re
import unicodedata

PHRASES = [
    ("challan online", "routine", "Roman Urdu", "Official payment procedure is routine context."),
    ("pay the challan", "routine", "English", "A fine is not an unofficial payment request."),
    ("receipt lena", "routine", "Roman Urdu", "Receipt guidance supports procedural context."),
    ("چالان جمع", "routine", "Urdu", "Official fine payment is routine context."),
    ("license wikhao", "routine", "Punjabi", "A license request alone is procedural."),
    ("bhai muhabbat karo", "ambiguous", "Roman Urdu", "Indirect phrase; intent cannot be determined without context."),
    ("kuch arrange kar do", "ambiguous", "Roman Urdu", "Unspecified request requires context and human review."),
    ("fir kaat leni hai", "ambiguous", "Roman Urdu", "May describe a legitimate procedure; not proof of coercion."),
    ("yahan se settle kar do", "ambiguous", "Roman Urdu", "Later receipt or explanation may change interpretation."),
    ("tumhein pata hai main kaun hoon", "ambiguous", "Roman Urdu", "Possible pressure; human context review required."),
    ("chai pani ka intezam", "ambiguous", "Roman Urdu", "Literal hospitality and indirect requests must be distinguished."),
    ("receipt ki zaroorat nahi", "coercive", "Roman Urdu", "Possible undocumented payment context, requiring corroboration."),
    ("idhar aa warna bike andar kar dunga", "coercive", "Roman Urdu", "Conditional threat indicator, not a legal conclusion."),
    ("chup raho zyada mat bolo", "coercive", "Roman Urdu", "Possible intimidation; review surrounding exchange."),
    ("cash do warna", "coercive", "Roman Urdu", "Conditional cash demand indicator."),
    ("madad emergency", "safety", "Roman Urdu", "Explicit request for emergency help; verify immediately."),
    ("officer needs help", "safety", "English", "Explicit safety request; human response required."),
]


def normalize(text):
    return re.sub(r"[^\w\s]", " ", unicodedata.normalize("NFKC", text).casefold()).replace("_", " ")


def phrase_events(segments, phrases):
    events = []
    for segment in segments:
        text = " ".join(normalize(segment["text"]).split())
        for phrase in phrases:
            needle = " ".join(normalize(phrase["phrase"]).split())
            if not phrase.get("active", 1) or not needle or not re.search(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", text):
                continue
            category = phrase["category"]
            # A phrase alone never establishes high-risk misconduct. Explicit safety
            # requests route to review, including possible quotation/negation.
            scores = {"routine": 5, "ambiguous": 60, "coercive": 85, "safety": 90}
            signals = {"speech": scores[category]}
            if category != "routine":
                signals["context"] = 45
            if category == "safety":
                signals["safety"] = True
            events.append({"start": segment["start"], "end": segment["end"], "kind": "speech",
                           "title": f"{category.title()} phrase indicator", "detail": phrase["explanation"],
                           "confidence": None, "source": "rule", "references": [segment["id"]], "signals": signals})
    return events


def fuse(events, settings, version=1, assessed=True):
    """Take the maximum aligned 8-second window, retaining missing channels as zero.

    Weights are policy heuristics, NOT learned coefficients or calibrated probabilities.
    A single ambiguous gesture/phrase is capped below High Risk. Safety overrides
    exist only for explicit, supported safety events and still require human review.
    """
    weights = settings["weights"]
    if not events:
        return {"score": 0 if assessed else None, "label": "Normal" if assessed else "Unassessed",
                "review_required": not assessed, "contributions": {}, "references": [], "version": version,
                "method": "temporal-rules-v1", "limitations": "Heuristic priority score, not probability or proof."}
    best, best_parts, best_refs = -1, {}, []
    safety = False
    for anchor in events:
        window = [e for e in events if anchor["start"] <= e["start"] <= anchor["start"] + 8]
        signals = {k: max(float(e.get("signals", {}).get(k, 0)) for e in window) for k in weights}
        parts = {k: round(signals[k] * weight, 2) for k, weight in weights.items()}
        score = sum(parts.values())
        meaningful = [e for e in window if e.get("signals", {}).get("speech", 0) >= 50 or any(e.get("signals", {}).get(k, 0) >= 40 for k in ("gesture", "body", "context"))]
        if meaningful:
            score = max(score, settings["ambiguous"])
        modalities = {e["kind"] for e in meaningful}
        if len(modalities) < 2:
            score = min(score, settings["high"] - 1)
        window_safety = any(e.get("signals", {}).get("safety") for e in window)
        if window_safety:
            score = max(score, settings["emergency"])
        # A safety override must retain the evidence that caused it, even when
        # a separate non-safety window has a higher numeric priority score.
        if (window_safety and not safety) or (window_safety == safety and score > best):
            best, best_parts, best_refs = score, parts, [e["id"] for e in window if "id" in e]
        safety = safety or window_safety
    best = round(min(best, 100), 1)
    label = "Emergency" if safety else "High Risk" if best >= settings["high"] else "Ambiguous" if best >= settings["ambiguous"] else "Low Risk" if best >= settings["low"] else "Normal"
    return {"score": best, "label": label, "review_required": label in ("Ambiguous", "High Risk", "Emergency"),
            "contributions": best_parts, "references": best_refs, "version": version, "method": "temporal-rules-v1",
            "limitations": "Policy-weighted priority score; not a calibrated probability or a finding of misconduct."}


@dataclass
class Capability:
    name: str
    status: str
    detail: str


class Transcriber(Protocol):
    def transcribe(self, path: str) -> list[dict]: ...


class VisionAnalyzer(Protocol):
    def analyze(self, path: str) -> list[dict]: ...


class LocalWhisper:
    def __init__(self, model_path):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(model_path, device="cpu", compute_type="int8", local_files_only=True)

    def transcribe(self, path):
        segments, info = self.model.transcribe(path, beam_size=3, vad_filter=True)
        return [{"start": s.start, "end": s.end, "text": s.text.strip(), "language": info.language,
                 "speaker": None, "source": "local_whisper"} for s in segments]


def capabilities(config):
    from pathlib import Path
    import importlib.util
    whisper = bool(config.whisper_model and Path(config.whisper_model).is_dir() and importlib.util.find_spec("faster_whisper"))
    return [
        {"name": "Media validation & redaction", "status": "available", "detail": "FFmpeg validates, normalizes and blurs the entire frame. Playback is silent to protect voices."},
        {"name": "Multilingual transcription", "status": "configured" if whisper else "unavailable", "detail": "Local faster-whisper model configured; successful inference is confirmed per job." if whisper else "Install faster-whisper and set SENTINEL_WHISPER_MODEL to local weights. No automatic downloads."},
        {"name": "Contextual phrase rules", "status": "available", "detail": "Editable Urdu / Roman Urdu / Punjabi phrase rules; no trained intent classifier."},
        {"name": "Temporal risk fusion", "status": "available", "detail": "8-second event alignment and versioned policy weights. Not calibrated probability."},
        {"name": "Gestures, pose & body language", "status": "unavailable", "detail": "Analyzer interface only. No installed trained model; demo observations are scripted."},
        {"name": "Violence & weapon detection", "status": "unavailable", "detail": "No trained detector configured. Real uploads do not receive these predictions."},
        {"name": "Speaker diarization & vocal tone", "status": "unavailable", "detail": "No diarization or tone model. Speakers remain unknown on real transcripts."},
        {"name": "Evidence summaries", "status": "available", "detail": "Deterministic, evidence-linked summaries. No LLM-generated factual claims."},
        {"name": "External notifications", "status": "unavailable", "detail": "Local event log only. No SMS, push, emergency calls or dispatch delivery."},
    ]
