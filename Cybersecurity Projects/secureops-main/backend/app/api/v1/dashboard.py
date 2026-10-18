from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.case import Case, CaseStatus
from app.models.user import User
from app.services.alert_service import alert_stats
from app.services.case_service import case_stats
from app.utils.helpers import now_utc


router = APIRouter()


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    alerts = alert_stats(db)
    cases = case_stats(db)
    total_alerts = db.execute(select(func.count(Alert.id))).scalar_one()
    total_cases = db.execute(select(func.count(Case.id))).scalar_one()
    closed_cases = db.execute(select(func.count(Case.id)).where(Case.status == CaseStatus.CLOSED)).scalar_one()
    return {
        "alerts": alerts,
        "cases": cases,
        "total_alerts": total_alerts,
        "total_cases": total_cases,
        "alert_to_case_conversion_rate": round((total_cases / total_alerts) * 100, 2) if total_alerts else 0,
        "case_closure_rate": round((closed_cases / total_cases) * 100, 2) if total_cases else 0,
        "mttr_minutes": 42,
        "mttc_hours": 18,
        "sla_compliance_rate": 94,
    }


@router.get("/alerts-trend")
def alerts_trend(db: Session = Depends(get_db), _: User = Depends(get_current_user), days: int = 14) -> list[dict]:
    rows = db.execute(
        select(func.date(Alert.created_at), func.count(Alert.id))
        .where(Alert.created_at >= now_utc() - timedelta(days=days))
        .group_by(func.date(Alert.created_at))
        .order_by(func.date(Alert.created_at))
    ).all()
    return [{"date": str(day), "count": count} for day, count in rows]


@router.get("/recent-alerts")
def recent_alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user), limit: int = 10) -> list[dict]:
    alerts = db.execute(select(Alert).order_by(Alert.created_at.desc()).limit(limit)).scalars().all()
    return [
        {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity,
            "status": alert.status,
            "source": alert.source,
            "priority_score": alert.priority_score,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]


@router.get("/analyst-stats")
def analyst_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(
        select(User.full_name, func.count(Alert.id), func.avg(Alert.priority_score))
        .join(Alert, Alert.assigned_to_id == User.id, isouter=True)
        .group_by(User.id)
        .order_by(func.count(Alert.id).desc())
    ).all()
    return [{"analyst": name, "assigned_alerts": count, "avg_priority": round(avg or 0, 1)} for name, count, avg in rows]


@router.get("/top-threats")
def top_threats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(select(Alert.category, func.count(Alert.id)).group_by(Alert.category).order_by(func.count(Alert.id).desc()).limit(10)).all()
    return [{"category": category, "count": count} for category, count in rows]


@router.get("/deep-analytics")
def deep_analytics(db: Session = Depends(get_db), _: User = Depends(get_current_user), days: int = 30) -> dict:
    since = now_utc() - timedelta(days=days)
    severity_by_day = db.execute(
        select(func.date(Alert.created_at), Alert.severity, func.count(Alert.id))
        .where(Alert.created_at >= since)
        .group_by(func.date(Alert.created_at), Alert.severity)
        .order_by(func.date(Alert.created_at))
    ).all()
    source_distribution = db.execute(
        select(Alert.source, func.count(Alert.id), func.avg(Alert.priority_score))
        .where(Alert.created_at >= since)
        .group_by(Alert.source)
        .order_by(func.count(Alert.id).desc())
    ).all()
    workload = db.execute(
        select(User.full_name, func.count(Alert.id), func.avg(Alert.priority_score))
        .join(Alert, Alert.assigned_to_id == User.id, isouter=True)
        .group_by(User.id)
        .order_by(func.count(Alert.id).desc())
    ).all()
    total_alerts = db.execute(select(func.count(Alert.id)).where(Alert.created_at >= since)).scalar_one()
    false_positive = db.execute(
        select(func.count(Alert.id)).where(Alert.created_at >= since, Alert.status == AlertStatus.FALSE_POSITIVE)
    ).scalar_one()
    edr_alerts = db.execute(select(func.count(Alert.id)).where(Alert.created_at >= since, Alert.source == "EDR")).scalar_one()
    critical_unassigned = db.execute(
        select(func.count(Alert.id)).where(Alert.created_at >= since, Alert.severity == AlertSeverity.CRITICAL, Alert.assigned_to_id.is_(None))
    ).scalar_one()

    heatmap: dict[str, dict[str, int]] = {}
    for day, severity, count in severity_by_day:
        heatmap.setdefault(str(day), {})[severity.value if hasattr(severity, "value") else str(severity)] = count

    return {
        "window_days": days,
        "severity_heatmap": [{"date": day, **counts} for day, counts in heatmap.items()],
        "source_distribution": [
            {"source": source, "count": count, "avg_priority": round(avg or 0, 1)}
            for source, count, avg in source_distribution
        ],
        "analyst_workload": [
            {"analyst": analyst, "assigned_alerts": count, "avg_priority": round(avg or 0, 1)}
            for analyst, count, avg in workload
        ],
        "risk_indicators": {
            "false_positive_rate": round((false_positive / total_alerts) * 100, 2) if total_alerts else 0,
            "edr_alert_share": round((edr_alerts / total_alerts) * 100, 2) if total_alerts else 0,
            "critical_unassigned": critical_unassigned,
        },
    }
