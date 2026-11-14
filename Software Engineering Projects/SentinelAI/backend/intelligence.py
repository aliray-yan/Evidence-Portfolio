"""Capabilities plus retired research rules for archived records/tests. New case and live processing never call phrase_events or fuse."""
from dataclasses import dataclass
from typing import Protocol
import re
import unicodedata
from .english_context import PHRASES as ENGLISH_PHRASES, scope as english_scope

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
    ("رسید لے", "routine", "Urdu", "Receipt guidance is procedural context, not an unofficial payment indicator."),
    ("سرکاری کاؤنٹر", "routine", "Urdu", "Official counter guidance can clarify payment context."),
    ("بھائی محبت کرو", "ambiguous", "Urdu", "Indirect wording can be friendly or contextual; review the surrounding exchange."),
    ("کچھ انتظام کر دو", "ambiguous", "Urdu", "Unspecified request; intent is unknown."),
    ("ایف آئی آر", "ambiguous", "Urdu", "An FIR reference may describe legitimate procedure; no adverse conclusion follows from this phrase."),
    ("چائے پانی", "ambiguous", "Urdu", "Hospitality and indirect requests must be distinguished using evidence."),
    ("رسید کی ضرورت نہیں", "coercive", "Urdu", "Possible undocumented-payment context; requires corroboration and human review."),
    ("پیسے دو ورنہ", "coercive", "Urdu", "Conditional money-demand wording; review context, negation and transcription accuracy."),
    ("چپ رہو", "coercive", "Urdu", "Possible intimidation wording; routine explanations or quotations may change the context."),
    ("ہنگامی مدد", "safety", "Urdu", "Emergency-assistance wording; urgent human assessment is required unless explicitly negated or quoted."),
    ("لائسنس وکھاؤ", "routine", "Punjabi", "A license request is procedural context."),
]
PHRASES += ENGLISH_PHRASES


def normalize(text):
    value = unicodedata.normalize("NFKC", text).casefold().translate(str.maketrans({"ك": "ک", "ي": "ی", "ى": "ی", "ـ": ""}))
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w\s]", " ", value).replace("_", " ")


def phrase_events(segments, phrases):
    events = []
    for segment in segments:
        text = " ".join(normalize(segment["text"]).split())
        for phrase in phrases:
            needle = " ".join(normalize(phrase["phrase"]).split())
            matches = list(re.finditer(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", text)) if needle else []
            if not phrase.get("active", 1) or not matches:
                continue
            # A later direct demand must not inherit an earlier denial of the same phrase.
            match = next((m for m in matches if english_scope(text,m.start(),m.end())=='direct_or_unknown'), matches[0]) if phrase.get('language')=='English' else matches[0]
            category = phrase["category"]
            # A phrase alone never establishes high-risk misconduct. Explicit safety
            # requests route to review, including possible quotation/negation.
            scores = {"routine": 5, "ambiguous": 60, "coercive": 85, "safety": 90}
            signals = {"speech": scores[category]}
            if category != "routine":
                signals["context"] = 45
            nearby = [s for s in segments if s['id'] != segment['id'] and abs(s['start']-segment['start']) <= 8]
            routine = [s for s in [segment, *nearby] if any(p['category']=='routine' and p.get('active',1) and re.search(r'(?<!\w)'+re.escape(' '.join(normalize(p['phrase']).split()))+r'(?!\w)', ' '.join(normalize(s['text']).split())) for p in phrases)]
            prefix, suffix = text[:match.start()].strip(), text[match.end():].strip()
            explicit_negation = bool(re.search(r'(?:\bno|\bnot|\bnever|\bexample|\bphrase|\bquote)\s*$', prefix) or re.match(r'^(?:نہیں|نہ چاہیے|nahi chahiye|is just an example)\b', suffix))
            explanation = phrase['explanation']
            english = english_scope(text,match.start(),match.end()) if phrase.get('language')=='English' else None
            if category != 'routine' and routine:
                signals['context'] = 20
                explanation += ' Official-procedure wording occurs within eight seconds; consider it as potentially conflicting context, not proof that the concern is resolved.'
            if category != 'routine' and explicit_negation:
                signals.update(speech=50, context=20)
                explanation += ' Adjacent wording explicitly negates or quotes this phrase. Automatic safety escalation is withheld; the ambiguous wording remains for review.'
            if category != 'routine' and segment.get('uncertain'):
                signals.update(speech=50,context=20)
                explanation += ' ASR marked this segment as low likelihood. Treat the wording as uncertain; verify before escalation.'
            if category == "safety" and not explicit_negation and not segment.get('uncertain'):
                signals["safety"] = True
            if english in ('negated','quoted','reported') and category != 'routine':
                signals.pop('safety',None)
                if category=='safety' or english in ('quoted','reported') or segment.get('uncertain'):
                    signals.update(speech=50,context=20)
                else:
                    signals.update(speech=5,context=0)
                explanation += f' English context scope: {english}. A denial is not an affirmative demand; quotations and reported allegations still need source verification.'
            events.append({"start": segment["start"], "end": segment["end"], "kind": "speech",
                           "title": f"{'Negated' if english=='negated' else 'Reported' if english=='reported' else 'Ambiguous' if explicit_negation or english=='quoted' else category.title()} phrase indicator", "detail": f'{explanation} Matched wording: “{phrase["phrase"]}”.',
                           "confidence": None, "source": "rule", "references": list(dict.fromkeys([segment["id"], *[s['id'] for s in routine]])), "signals": signals})
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


def capabilities(config):
    from pathlib import Path
    import importlib.util
    from sentinel_ml.bundle import configured_status
    from .notifications import delivery_status
    from .reading_model import free_model
    vision_status, vision_detail = configured_status(config.violence_model)
    from importlib.metadata import version, PackageNotFoundError
    try:
        mediapipe_ready = version('mediapipe') == '0.10.21'
    except PackageNotFoundError:
        mediapipe_ready = False
    perception_paths = [p for p in (config.gesture_model, config.pose_model) if p]
    perception_ready = bool(perception_paths and mediapipe_ready and all(Path(p).is_file() for p in perception_paths))
    face_ready = bool(config.face_model and Path(config.face_model).is_file() and mediapipe_ready)
    acoustic_ready = bool(config.acoustic_model and Path(config.acoustic_model).is_file() and mediapipe_ready)
    objects_ready = bool(config.object_model and Path(config.object_model).is_file() and importlib.util.find_spec('torchvision'))
    from .exchange_adapter import configured as exchange_configured
    learned = bool(getattr(config, 'learned_exchange_model', ''))
    exchange_detail = ('Learned visual-transfer windows at 4 samples/second, using a locally screened CPU model. '
                       'Successful loading and inference are confirmed per case. No action boxes, currency or intent recognition; '
                       'laboratory screening is not independent field validation.') if learned else (
                       'YOLO person boxes, hand landmarks and temporal rectangular-object transfer rules. '
                       'No currency recognition, audio analysis or trained bribery classifier. Requires independent visual evaluation.')
    return [
        {"name":"Vision-only exchange review","status":"configured_experimental" if exchange_configured(config) else "unavailable","detail":exchange_detail},
        {"name":"Audio analysis","status":"removed","detail":"Speech-to-text, phrase matching, conversation analysis and audio-video fusion do not run for new cases or live streams."},
        {"name": "Media validation & redaction", "status": "available", "detail": "FFmpeg validates, normalizes and blurs the entire frame. Playback is silent to protect voices."},
        {"name": "Hand shapes & pose observations", "status": "configured" if perception_ready else "unavailable", "detail": "Local MediaPipe hand-shape/pose models selected; successful inference is confirmed per case. Neutral observations do not add risk points. No trained money-rubbing, aggression or intent model." if perception_ready else "Selected models and the pinned MediaPipe 0.10.21 runtime are required. Check requirements-ai.txt and local AI setup. Demo observations remain scripted."},
        {"name": "Selective face-redaction review", "status": "configured" if face_ready else "unavailable", "detail": "Face-detection copy is restricted to supervisors until they approve its privacy coverage. Default playback remains fully blurred and silent. Missed faces and other identifiers require manual review." if face_ready else "A local face detector and pinned MediaPipe 0.10.21 runtime are required. Default full-frame blur remains available."},
        {"name": "Visual fight classification", "status": vision_status, "detail": vision_detail},
        {"name": "Knife / scissors object candidates", "status": "configured" if objects_ready else "unavailable", "detail": "Local COCO object detector selected. Generic knife/scissors candidates require context review; no firearm, injury or weapon-use classifier. Successful inference is confirmed per case." if objects_ready else "A local object model and Torchvision runtime are required. No firearm, injury or weapon-use classifier."},
        {"name": "Local evidence search", "status": "configured" if config.retrieval_model else "keyword_only", "detail": "Authorized case excerpts with timestamps. Optional local multilingual semantic indexing; exact keyword search remains available. Similarity is not confidence or proof. No cloud transfer."},
        {"name": "Evidence summaries", "status": "available", "detail": "Deterministic, evidence-linked summaries. No LLM-generated factual claims."},
        {"name": "Optional cloud reading guide", "status": "configured" if config.openrouter_key and free_model(config.openrouter_model) else "unavailable", "detail": "Manual reviewer-only excerpt selection through OpenRouter. Configuration does not confirm provider availability. Preview and consent are required; synthetic-only by default. Free endpoints can reject or rate-limit requests. No generated facts or changes to decisions."},
        {"name": "External notifications", **{k:v for k,v in delivery_status(config).items() if k!='enabled'}},
    ]
