from datetime import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertSeverity
from app.models.priority import AssetCriticality, FalsePositivePattern, PriorityRule
from app.utils.helpers import clamp, now_utc


SEVERITY_POINTS = {
    AlertSeverity.CRITICAL: 25,
    AlertSeverity.HIGH: 20,
    AlertSeverity.MEDIUM: 12,
    AlertSeverity.LOW: 5,
    AlertSeverity.INFORMATIONAL: 0,
}

SOURCE_RELIABILITY = {
    "EDR": 18,
    "IDS": 16,
    "Firewall": 14,
    "Email Gateway": 13,
    "SIEM": 15,
    "Cloud Security": 16,
}

ASSET_POINTS = {"critical": 10, "high": 8, "medium": 5, "low": 2}


def _field_value(alert: Alert, field: str) -> str:
    return str(getattr(alert, field, "") or "")


def false_positive_confidence(db: Session, alert: Alert) -> float:
    patterns = db.execute(select(FalsePositivePattern).where(FalsePositivePattern.is_active.is_(True))).scalars().all()
    confidence = 0.0
    for pattern in patterns:
        value = _field_value(alert, pattern.field)
        matched = False
        if pattern.pattern_type == "exact":
            matched = value == pattern.pattern
        elif pattern.pattern_type == "contains":
            matched = pattern.pattern.lower() in value.lower()
        else:
            import re

            matched = bool(re.search(pattern.pattern, value, flags=re.IGNORECASE))
        if matched:
            pattern.times_matched += 1
            confidence = max(confidence, pattern.confidence)
    return confidence


def score_alert(db: Session, alert: Alert, ioc_risk_score: int | None = None) -> int:
    score = SOURCE_RELIABILITY.get(alert.source, 10)
    score += SEVERITY_POINTS.get(alert.severity, 0)
    if ioc_risk_score is not None:
        score += min(25, round(ioc_risk_score * 0.25))
    elif alert.iocs:
        score += min(15, len(alert.iocs) * 5)

    similar_count = db.execute(
        select(func.count(Alert.id)).where(Alert.category == alert.category, Alert.id != alert.id)
    ).scalar_one()
    score += min(15, int(similar_count // 5))

    for ioc in alert.iocs or []:
        value = ioc.get("value")
        asset = db.execute(select(AssetCriticality).where(AssetCriticality.asset_identifier == value)).scalar_one_or_none()
        if asset:
            score += ASSET_POINTS.get(str(asset.criticality), 0)

    hour = now_utc().time()
    if hour < time(8, 0) or hour > time(18, 0):
        score += 5
    if alert.category.lower() in {"malware", "ransomware", "data exfiltration"}:
        score += 10

    rules = db.execute(select(PriorityRule).where(PriorityRule.is_active.is_(True))).scalars().all()
    for rule in rules:
        conditions = rule.conditions or {}
        matched = True
        for field, expected in conditions.items():
            if str(getattr(alert, field, "")).lower() != str(expected).lower():
                matched = False
                break
        if matched:
            score += rule.score_modifier

    fp_confidence = false_positive_confidence(db, alert)
    if fp_confidence >= 0.8:
        score -= 10
    return clamp(score)


def next_best_action(alert: Alert) -> str:
    if alert.severity == AlertSeverity.CRITICAL:
        return "Escalate to senior analyst, create an incident case, and isolate affected assets if confirmed."
    if alert.category.lower() == "phishing":
        return "Run phishing playbook, enrich URLs and sender, then search for impacted users."
    if alert.iocs:
        return "Enrich IOCs, review related alerts, and correlate against recent cases."
    return "Triage the raw event, validate source context, and assign ownership."
