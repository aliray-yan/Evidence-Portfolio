import random
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertComment, AlertHistory, AlertSeverity, AlertStatus
from app.schemas.alert import AlertCreate, AlertUpdate
from app.services.priority_service import score_alert
from app.utils.helpers import now_utc
from app.utils.validators import extract_iocs


def create_alert(db: Session, payload: AlertCreate, user_id: str | None = None) -> Alert:
    iocs = [ioc.model_dump() for ioc in payload.iocs] if payload.iocs else extract_iocs(f"{payload.description} {payload.raw_log or ''}")
    alert = Alert(
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        source=payload.source,
        source_ref=payload.source_ref,
        category=payload.category,
        iocs=iocs,
        raw_log=payload.raw_log,
        assigned_to_id=payload.assigned_to_id,
        first_seen=payload.first_seen or now_utc(),
        last_seen=payload.last_seen or now_utc(),
    )
    db.add(alert)
    db.flush()
    alert.priority_score = score_alert(db, alert)
    db.add(AlertHistory(alert_id=alert.id, user_id=user_id, field_changed="created", old_value=None, new_value=alert.status.value))
    db.commit()
    db.refresh(alert)
    return alert


def upsert_alert_by_source_ref(db: Session, payload: AlertCreate, user_id: str | None = None) -> tuple[Alert, bool]:
    if not payload.source_ref:
        return create_alert(db, payload, user_id), True

    alert = db.execute(
        select(Alert).where(Alert.source == payload.source, Alert.source_ref == payload.source_ref)
    ).scalar_one_or_none()
    if not alert:
        return create_alert(db, payload, user_id), True

    iocs = [ioc.model_dump() for ioc in payload.iocs] if payload.iocs else extract_iocs(f"{payload.description} {payload.raw_log or ''}")
    updates = {
        "title": payload.title,
        "description": payload.description,
        "severity": payload.severity,
        "category": payload.category,
        "iocs": iocs,
        "raw_log": payload.raw_log,
        "last_seen": payload.last_seen or now_utc(),
    }
    changed = False
    for field, value in updates.items():
        old = getattr(alert, field)
        if old != value:
            setattr(alert, field, value)
            db.add(AlertHistory(alert_id=alert.id, user_id=user_id, field_changed=field, old_value=str(old), new_value=str(value)))
            changed = True
    if changed:
        alert.priority_score = score_alert(db, alert)
        alert.updated_at = now_utc()
    db.commit()
    db.refresh(alert)
    return alert, False


def update_alert(db: Session, alert: Alert, payload: AlertUpdate, user_id: str | None = None) -> Alert:
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "iocs" and value is not None:
            value = [item if isinstance(item, dict) else item.model_dump() for item in value]
        old = getattr(alert, field)
        if old != value:
            setattr(alert, field, value)
            db.add(AlertHistory(alert_id=alert.id, user_id=user_id, field_changed=field, old_value=str(old), new_value=str(value)))
    if "priority_score" not in updates:
        alert.priority_score = score_alert(db, alert)
    db.commit()
    db.refresh(alert)
    return alert


def add_alert_comment(db: Session, alert: Alert, user_id: str | None, comment: str) -> AlertComment:
    row = AlertComment(alert_id=alert.id, user_id=user_id, comment=comment)
    db.add(row)
    db.add(AlertHistory(alert_id=alert.id, user_id=user_id, field_changed="comment", old_value=None, new_value=comment[:250]))
    db.commit()
    db.refresh(row)
    return row


def alert_stats(db: Session) -> dict:
    now = now_utc()
    counts = {
        "total_24h": db.execute(select(func.count(Alert.id)).where(Alert.created_at >= now - timedelta(hours=24))).scalar_one(),
        "total_7d": db.execute(select(func.count(Alert.id)).where(Alert.created_at >= now - timedelta(days=7))).scalar_one(),
        "total_30d": db.execute(select(func.count(Alert.id)).where(Alert.created_at >= now - timedelta(days=30))).scalar_one(),
    }
    severity_rows = db.execute(select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)).all()
    status_rows = db.execute(select(Alert.status, func.count(Alert.id)).group_by(Alert.status)).all()
    source_rows = db.execute(select(Alert.source, func.count(Alert.id)).group_by(Alert.source).order_by(func.count(Alert.id).desc()).limit(10)).all()
    return {
        **counts,
        "severity_breakdown": {str(k.value): v for k, v in severity_rows},
        "status_breakdown": {str(k.value): v for k, v in status_rows},
        "top_sources": [{"source": source, "count": count} for source, count in source_rows],
    }


ALERT_TEMPLATES = [
    {
        "title": "Multiple Failed SSH Login Attempts",
        "description": "Detected 50 failed SSH login attempts from IP {ip} to server prod-web-01 within 5 minutes.",
        "severity": AlertSeverity.HIGH,
        "source": "IDS",
        "category": "Brute Force",
    },
    {
        "title": "Malicious File Hash Detected",
        "description": "Known malware hash detected on endpoint WKS-FINANCE-01: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.",
        "severity": AlertSeverity.CRITICAL,
        "source": "EDR",
        "category": "Malware",
    },
    {
        "title": "Suspicious DNS Query",
        "description": "Endpoint WKS-SALES-08 queried newly registered domain {domain} after receiving external email.",
        "severity": AlertSeverity.MEDIUM,
        "source": "DNS Security",
        "category": "Command and Control",
    },
    {
        "title": "Phishing Email Detected",
        "description": "Email gateway quarantined credential harvest attempt from attacker@{domain} containing URL https://{domain}/login/verify.",
        "severity": AlertSeverity.HIGH,
        "source": "Email Gateway",
        "category": "Phishing",
    },
    {
        "title": "Outbound Data Transfer Spike",
        "description": "Server db-prod-02 transferred 4.7 GB to {ip} outside normal business hours.",
        "severity": AlertSeverity.CRITICAL,
        "source": "SIEM",
        "category": "Data Exfiltration",
    },
    {
        "title": "Port Scan Detected",
        "description": "Firewall blocked sequential connection attempts from {ip} across 140 ports.",
        "severity": AlertSeverity.MEDIUM,
        "source": "Firewall",
        "category": "Reconnaissance",
    },
]


def generate_sample_alerts(db: Session, count: int = 100) -> int:
    existing = db.execute(select(func.count(Alert.id))).scalar_one()
    if existing >= count:
        return 0
    needed = count - existing
    statuses = list(AlertStatus)
    domains = ["secure-update.example", "invoice-review.test", "cdn-support.local", "auth-check.example"]
    created = 0
    for index in range(needed):
        template = random.choice(ALERT_TEMPLATES)
        ip = f"203.0.113.{random.randint(10, 240)}"
        domain = random.choice(domains)
        created_at = now_utc() - timedelta(hours=random.randint(0, 720), minutes=random.randint(0, 59))
        payload = AlertCreate(
            title=template["title"],
            description=template["description"].format(ip=ip, domain=domain),
            severity=template["severity"],
            source=template["source"],
            source_ref=f"SRC-{now_utc().year}-{index + 1:05d}",
            category=template["category"],
            raw_log=f"event_id={random.randint(10000,99999)} src={ip} category={template['category']}",
            first_seen=created_at,
            last_seen=created_at + timedelta(minutes=random.randint(1, 90)),
        )
        alert = Alert(
            title=payload.title,
            description=payload.description,
            severity=payload.severity,
            status=random.choice(statuses),
            source=payload.source,
            source_ref=payload.source_ref,
            category=payload.category,
            iocs=extract_iocs(f"{payload.description} {payload.raw_log}"),
            raw_log=payload.raw_log,
            first_seen=payload.first_seen or created_at,
            last_seen=payload.last_seen or created_at,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(alert)
        db.flush()
        alert.priority_score = score_alert(db, alert)
        created += 1
    db.commit()
    return created
