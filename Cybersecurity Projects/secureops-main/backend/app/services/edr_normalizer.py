import json
from typing import Iterable

from app.models.alert import AlertSeverity
from app.schemas.alert import AlertCreate, IOCItem
from app.schemas.ingest import EDRAlertIn
from app.utils.validators import detect_ioc_type, extract_iocs


EVENT_CATEGORY_MAP = {
    "ihadrs_threat": "Mobile Threat",
    "apk_malware_detected": "Malware",
    "malware_detected": "Malware",
    "suspicious_app": "Suspicious Application",
    "root_detected": "Device Tampering",
    "jailbreak_detected": "Device Tampering",
    "c2_beacon": "Command and Control",
    "credential_theft": "Credential Theft",
    "data_exfiltration": "Data Exfiltration",
    "risky_permission": "Policy Violation",
    "network_anomaly": "Network Anomaly",
}

IHADRS_CATEGORY_MAP = {
    "MALICIOUS_APP": "Malware",
    "RISKY_APP": "Suspicious Application",
    "NETWORK": "Network Anomaly",
    "DEVICE": "Device Tampering",
    "POLICY": "Policy Violation",
}

HIGH_RISK_EVENT_TYPES = {
    "apk_malware_detected",
    "malware_detected",
    "credential_theft",
    "data_exfiltration",
    "c2_beacon",
}


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    return stripped or None


def _severity(payload: EDRAlertIn) -> AlertSeverity:
    if payload.severity == AlertSeverity.INFORMATIONAL and payload.event_type in HIGH_RISK_EVENT_TYPES:
        return AlertSeverity.HIGH
    if payload.is_rooted_or_jailbroken and payload.severity in {AlertSeverity.LOW, AlertSeverity.INFORMATIONAL}:
        return AlertSeverity.MEDIUM
    if payload.confidence and payload.confidence >= 0.95 and payload.event_type in HIGH_RISK_EVENT_TYPES:
        return AlertSeverity.CRITICAL if payload.severity == AlertSeverity.HIGH else payload.severity
    return payload.severity


def _category(payload: EDRAlertIn) -> str:
    raw_category = (payload.raw_event or {}).get("category")
    if raw_category in IHADRS_CATEGORY_MAP:
        return IHADRS_CATEGORY_MAP[raw_category]
    if payload.category and payload.category != "Endpoint Detection":
        return payload.category
    if payload.event_type:
        return EVENT_CATEGORY_MAP.get(payload.event_type, "Endpoint Detection")
    return payload.category


def _add_ioc(iocs: list[dict[str, str]], ioc_type: str, value: str | None) -> None:
    cleaned = _clean(value)
    if cleaned:
        iocs.append({"type": ioc_type, "value": cleaned})


def _auto_iocs(payload: EDRAlertIn) -> list[dict[str, str]]:
    iocs = [ioc.model_dump() for ioc in payload.iocs]

    for candidate in [payload.file_hash, payload.src_ip, payload.dst_ip]:
        cleaned = _clean(candidate)
        if not cleaned:
            continue
        detected = detect_ioc_type(cleaned)
        if detected != "unknown":
            iocs.append({"type": detected, "value": cleaned})

    _add_ioc(iocs, "hostname", payload.hostname)
    _add_ioc(iocs, "device", payload.device_id or payload.endpoint_id)
    _add_ioc(iocs, "package", payload.package_name)
    _add_ioc(iocs, "process", payload.process_name)

    text_blob = json.dumps(payload.raw_event or {}, default=str)
    iocs.extend(extract_iocs(f"{payload.description or ''} {payload.command_line or ''} {text_blob}"))

    deduped: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for ioc in iocs:
        key = (ioc["type"], ioc["value"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(ioc)
    return deduped


def _lines(items: Iterable[tuple[str, str | None]]) -> list[str]:
    return [f"{label}: {value}" for label, value in items if _clean(value)]


def normalize_edr_alert(payload: EDRAlertIn) -> AlertCreate:
    raw_event = payload.raw_event or {}
    event_type = payload.event_type or raw_event.get("event_type")
    triggered_rules = raw_event.get("triggered_rules") or []
    mitre_techniques = raw_event.get("mitre_techniques") or []
    remediation = raw_event.get("remediation") or []
    risk_score = raw_event.get("risk_score")
    ihadrs_id = raw_event.get("ihadrs_id")
    identity = payload.hostname or payload.device_id or payload.endpoint_id or "unknown device"
    summary = payload.description or f"{payload.title} on {identity}"
    context_lines = _lines(
        [
            ("Device", payload.device_id or payload.endpoint_id),
            ("Hostname", payload.hostname),
            ("Platform", payload.platform),
            ("OS", payload.os_version),
            ("EDR app", payload.app_version),
            ("User", payload.username),
            ("Package", payload.package_name),
            ("Process", payload.process_name),
            ("Command", payload.command_line),
            ("Source IP", payload.src_ip),
            ("Destination IP", payload.dst_ip),
            ("Protocol", payload.network_protocol),
            ("Action", payload.action_taken),
            ("Confidence", f"{payload.confidence:.2f}" if payload.confidence is not None else None),
            ("Root/Jailbreak", str(payload.is_rooted_or_jailbroken) if payload.is_rooted_or_jailbroken is not None else None),
            ("IHADRS ID", ihadrs_id),
            ("Event type", event_type),
            ("Risk score", str(risk_score) if risk_score is not None else None),
            ("Rules", ", ".join(triggered_rules) if triggered_rules else None),
            ("MITRE", ", ".join(mitre_techniques) if mitre_techniques else None),
            ("Remediation", "; ".join(remediation) if remediation else None),
        ]
    )
    description = "\n".join([summary, *context_lines])
    raw = payload.model_dump(mode="json")
    raw["normalized_by"] = "secureops-edr-normalizer-v1"

    return AlertCreate(
        title=payload.title,
        description=description,
        severity=_severity(payload),
        source="EDR",
        source_ref=payload.alert_id,
        category=_category(payload),
        iocs=[IOCItem(**ioc) for ioc in _auto_iocs(payload)],
        raw_log=json.dumps(raw, default=str, indent=2),
    )
