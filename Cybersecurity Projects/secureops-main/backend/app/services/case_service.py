from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.case import Case, CaseAlert, CaseComment, CaseSeverity, CaseStatus, CaseTask, CaseTimeline
from app.schemas.case import CaseCreate, CaseTaskCreate, CaseTaskUpdate, CaseUpdate
from app.utils.helpers import now_utc


SLA_HOURS = {
    CaseSeverity.CRITICAL: 4,
    CaseSeverity.HIGH: 12,
    CaseSeverity.MEDIUM: 48,
    CaseSeverity.LOW: 96,
}


def next_case_number(db: Session) -> str:
    year = now_utc().year
    count = db.execute(select(func.count(Case.id)).where(Case.case_number.like(f"INC-{year}-%"))).scalar_one()
    return f"INC-{year}-{count + 1:04d}"


def timeline(db: Session, case_id: str, user_id: str | None, event_type: str, description: str, old: str | None = None, new: str | None = None) -> None:
    db.add(CaseTimeline(case_id=case_id, user_id=user_id, event_type=event_type, description=description, old_value=old, new_value=new))


def link_alert(db: Session, case: Case, alert: Alert, user_id: str | None) -> None:
    existing = db.get(CaseAlert, {"case_id": case.id, "alert_id": alert.id})
    if existing:
        return
    db.add(CaseAlert(case_id=case.id, alert_id=alert.id, linked_by_id=user_id))
    alert.case_id = case.id
    timeline(db, case.id, user_id, "alert_linked", f"Linked alert {alert.title}", None, alert.id)


def create_case(db: Session, payload: CaseCreate, user_id: str | None) -> Case:
    case = Case(
        case_number=next_case_number(db),
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        priority=payload.priority,
        category=payload.category,
        created_by_id=user_id,
        assigned_to_id=payload.assigned_to_id,
        status=CaseStatus.ASSIGNED if payload.assigned_to_id else CaseStatus.NEW,
        sla_deadline=now_utc() + timedelta(hours=SLA_HOURS[payload.severity]),
    )
    db.add(case)
    db.flush()
    timeline(db, case.id, user_id, "created", "Case created")
    for alert_id in payload.linked_alert_ids:
        alert = db.get(Alert, alert_id)
        if alert:
            link_alert(db, case, alert, user_id)
    db.commit()
    db.refresh(case)
    return case


def update_case(db: Session, case: Case, payload: CaseUpdate, user_id: str | None) -> Case:
    updates = payload.model_dump(exclude_unset=True)
    status_comment = updates.pop("status_comment", None)
    for field, value in updates.items():
        old = getattr(case, field)
        if old != value:
            setattr(case, field, value)
            timeline(db, case.id, user_id, "status_change" if field == "status" else "updated", f"Changed {field}", str(old), str(value))
    if case.status == CaseStatus.CLOSED and not case.closed_at:
        case.closed_at = now_utc()
    if status_comment:
        db.add(CaseComment(case_id=case.id, user_id=user_id, comment=status_comment, is_internal=True))
    db.commit()
    db.refresh(case)
    return case


def add_case_comment(db: Session, case: Case, user_id: str | None, comment: str, is_internal: bool = True) -> CaseComment:
    row = CaseComment(case_id=case.id, user_id=user_id, comment=comment, is_internal=is_internal)
    db.add(row)
    timeline(db, case.id, user_id, "comment", "Comment added")
    db.commit()
    db.refresh(row)
    return row


def add_task(db: Session, case: Case, payload: CaseTaskCreate, user_id: str | None) -> CaseTask:
    task = CaseTask(
        case_id=case.id,
        title=payload.title,
        description=payload.description,
        assigned_to_id=payload.assigned_to_id,
        due_date=payload.due_date,
    )
    db.add(task)
    timeline(db, case.id, user_id, "task_created", f"Task added: {task.title}")
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: CaseTask, payload: CaseTaskUpdate, user_id: str | None) -> CaseTask:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    if task.status == "completed" and not task.completed_at:
        task.completed_at = now_utc()
    timeline(db, task.case_id, user_id, "task_updated", f"Task updated: {task.title}")
    db.commit()
    db.refresh(task)
    return task


def case_stats(db: Session) -> dict:
    status_rows = db.execute(select(Case.status, func.count(Case.id)).group_by(Case.status)).all()
    severity_rows = db.execute(select(Case.severity, func.count(Case.id)).group_by(Case.severity)).all()
    open_count = db.execute(select(func.count(Case.id)).where(Case.status != CaseStatus.CLOSED)).scalar_one()
    closed_count = db.execute(select(func.count(Case.id)).where(Case.status == CaseStatus.CLOSED)).scalar_one()
    breached = db.execute(select(func.count(Case.id)).where(Case.sla_breached.is_(True))).scalar_one()
    return {
        "open": open_count,
        "closed": closed_count,
        "sla_breached": breached,
        "status_breakdown": {row[0].value: row[1] for row in status_rows},
        "severity_breakdown": {row[0].value: row[1] for row in severity_rows},
    }
