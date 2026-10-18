from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst
from app.database import get_db
from app.models.alert import Alert, AlertHistory, AlertSeverity, AlertStatus
from app.models.case import Case, CaseAlert
from app.models.user import User
from app.schemas.alert import (
    AlertAssignRequest,
    AlertCommentCreate,
    AlertCommentRead,
    AlertCreate,
    AlertEscalateRequest,
    AlertHistoryRead,
    AlertLinkCaseRequest,
    AlertRead,
    AlertUpdate,
    BulkAlertAction,
    PaginatedAlerts,
)
from app.services.alert_service import add_alert_comment, alert_stats, create_alert, update_alert
from app.services.websocket_manager import websocket_manager


router = APIRouter()


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    return alert_stats(db)


@router.get("", response_model=PaginatedAlerts)
def list_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    severity: AlertSeverity | None = None,
    status_filter: AlertStatus | None = Query(default=None, alias="status"),
    source: str | None = None,
    assignee: str | None = None,
    q: str | None = None,
) -> dict:
    stmt = select(Alert)
    count_stmt = select(func.count(Alert.id))
    conditions = []
    if severity:
        conditions.append(Alert.severity == severity)
    if status_filter:
        conditions.append(Alert.status == status_filter)
    if source:
        conditions.append(Alert.source == source)
    if assignee:
        conditions.append(Alert.assigned_to_id == assignee)
    if q:
        conditions.append(or_(Alert.title.contains(q), Alert.description.contains(q), Alert.raw_log.contains(q)))
    if conditions:
        stmt = stmt.where(*conditions)
        count_stmt = count_stmt.where(*conditions)
    total = db.execute(count_stmt).scalar_one()
    items = db.execute(stmt.order_by(Alert.priority_score.desc(), Alert.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
async def create(payload: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Alert:
    alert = create_alert(db, payload, current_user.id)
    await websocket_manager.broadcast("alert_created", AlertRead.model_validate(alert).model_dump(mode="json"))
    return alert


@router.post("/bulk-action")
def bulk_action(payload: BulkAlertAction, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> dict:
    alerts = db.execute(select(Alert).where(Alert.id.in_(payload.alert_ids))).scalars().all()
    for alert in alerts:
        if payload.action == "assign" and payload.assigned_to_id:
            old = alert.assigned_to_id
            alert.assigned_to_id = payload.assigned_to_id
            db.add(AlertHistory(alert_id=alert.id, user_id=current_user.id, field_changed="assigned_to_id", old_value=str(old), new_value=payload.assigned_to_id))
        elif payload.action == "status" and payload.status:
            old = alert.status
            alert.status = payload.status
            db.add(AlertHistory(alert_id=alert.id, user_id=current_user.id, field_changed="status", old_value=str(old), new_value=str(payload.status)))
        elif payload.action == "escalate":
            old = alert.status
            alert.status = AlertStatus.ESCALATED
            db.add(AlertHistory(alert_id=alert.id, user_id=current_user.id, field_changed="status", old_value=str(old), new_value=AlertStatus.ESCALATED.value))
    db.commit()
    return {"updated": len(alerts)}


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.put("/{alert_id}", response_model=AlertRead)
async def update(alert_id: str, payload: AlertUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    updated = update_alert(db, alert, payload, current_user.id)
    await websocket_manager.broadcast("alert_updated", AlertRead.model_validate(updated).model_dump(mode="json"))
    return updated


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(alert_id: str, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> None:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()


@router.post("/{alert_id}/assign", response_model=AlertRead)
def assign(alert_id: str, payload: AlertAssignRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return update_alert(db, alert, AlertUpdate(assigned_to_id=payload.assigned_to_id, status=AlertStatus.IN_PROGRESS), current_user.id)


@router.post("/{alert_id}/escalate", response_model=AlertRead)
def escalate(alert_id: str, payload: AlertEscalateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    updated = update_alert(db, alert, AlertUpdate(status=AlertStatus.ESCALATED), current_user.id)
    if payload.comment:
        add_alert_comment(db, alert, current_user.id, payload.comment)
    return updated


@router.post("/{alert_id}/comment", response_model=AlertCommentRead)
def comment(alert_id: str, payload: AlertCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> AlertCommentRead:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return add_alert_comment(db, alert, current_user.id, payload.comment)


@router.get("/{alert_id}/timeline", response_model=list[AlertHistoryRead])
def timeline(alert_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[AlertHistory]:
    return list(db.execute(select(AlertHistory).where(AlertHistory.alert_id == alert_id).order_by(AlertHistory.timestamp.desc())).scalars().all())


@router.post("/{alert_id}/link-case", response_model=AlertRead)
def link_case(alert_id: str, payload: AlertLinkCaseRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Alert:
    alert = db.get(Alert, alert_id)
    case = db.get(Case, payload.case_id)
    if not alert or not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert or case not found")
    if not db.get(CaseAlert, {"case_id": case.id, "alert_id": alert.id}):
        db.add(CaseAlert(case_id=case.id, alert_id=alert.id, linked_by_id=current_user.id))
    alert.case_id = case.id
    db.add(AlertHistory(alert_id=alert.id, user_id=current_user.id, field_changed="case_id", old_value=None, new_value=case.id))
    db.commit()
    db.refresh(alert)
    return alert
