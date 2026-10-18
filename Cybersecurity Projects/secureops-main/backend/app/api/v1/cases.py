from pathlib import Path

import base64

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst
from app.database import get_db
from app.models.alert import Alert
from app.models.case import Case, CaseAttachment, CaseStatus, CaseTask, CaseTimeline
from app.models.user import User
from app.schemas.case import (
    CaseAssignRequest,
    CaseCommentCreate,
    CaseCommentRead,
    CaseCreate,
    CaseRead,
    CaseTaskCreate,
    CaseTaskRead,
    CaseTaskUpdate,
    CaseTimelineRead,
    CaseUpdate,
    PaginatedCases,
)
from app.services.case_service import add_case_comment, add_task, case_stats, create_case, update_case, update_task


router = APIRouter()
UPLOAD_ROOT = Path("uploads/cases")


class AttachmentPayload(BaseModel):
    filename: str
    content_base64: str | None = None
    file_type: str | None = None
    description: str | None = None


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    return case_stats(db)


@router.get("/board")
def board(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    assignee: str | None = None,
    severity: str | None = None,
) -> dict:
    stmt = select(Case)
    conditions = []
    if assignee:
        conditions.append(Case.assigned_to_id == assignee)
    if severity:
        conditions.append(Case.severity == severity)
    if conditions:
        stmt = stmt.where(*conditions)
    cases = db.execute(stmt.order_by(Case.updated_at.desc())).scalars().all()
    return {status.value: [CaseRead.model_validate(case).model_dump() for case in cases if case.status == status] for status in CaseStatus}


@router.get("", response_model=PaginatedCases)
def list_cases(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: CaseStatus | None = Query(default=None, alias="status"),
    assignee: str | None = None,
    q: str | None = None,
) -> dict:
    stmt = select(Case)
    count_stmt = select(func.count(Case.id))
    conditions = []
    if status_filter:
        conditions.append(Case.status == status_filter)
    if assignee:
        conditions.append(Case.assigned_to_id == assignee)
    if q:
        conditions.append(or_(Case.title.contains(q), Case.description.contains(q), Case.case_number.contains(q)))
    if conditions:
        stmt = stmt.where(*conditions)
        count_stmt = count_stmt.where(*conditions)
    total = db.execute(count_stmt).scalar_one()
    items = db.execute(stmt.order_by(Case.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
def create(payload: CaseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Case:
    return create_case(db, payload, current_user.id)


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Case:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.put("/{case_id}", response_model=CaseRead)
def update(case_id: str, payload: CaseUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Case:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return update_case(db, case, payload, current_user.id)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(case_id: str, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> None:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    db.delete(case)
    db.commit()


@router.post("/{case_id}/assign", response_model=CaseRead)
def assign(case_id: str, payload: CaseAssignRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Case:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return update_case(db, case, CaseUpdate(assigned_to_id=payload.assigned_to_id, status=CaseStatus.ASSIGNED), current_user.id)


@router.post("/{case_id}/comment", response_model=CaseCommentRead)
def comment(case_id: str, payload: CaseCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> CaseCommentRead:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return add_case_comment(db, case, current_user.id, payload.comment, payload.is_internal)


@router.post("/{case_id}/task", response_model=CaseTaskRead)
def create_task(case_id: str, payload: CaseTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> CaseTask:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return add_task(db, case, payload, current_user.id)


@router.put("/{case_id}/task/{task_id}", response_model=CaseTaskRead)
def edit_task(case_id: str, task_id: str, payload: CaseTaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> CaseTask:
    task = db.get(CaseTask, task_id)
    if not task or task.case_id != case_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return update_task(db, task, payload, current_user.id)


@router.post("/{case_id}/attachment")
def attachment(case_id: str, payload: AttachmentPayload, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> dict:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_ROOT / f"{case_id}-{payload.filename}"
    content = base64.b64decode(payload.content_base64) if payload.content_base64 else b""
    path.write_bytes(content)
    row = CaseAttachment(
        case_id=case_id,
        filename=payload.filename or "attachment.bin",
        file_path=str(path),
        file_type=payload.file_type,
        file_size=len(content),
        uploaded_by_id=current_user.id,
        description=payload.description,
    )
    db.add(row)
    db.commit()
    return {"id": row.id, "filename": row.filename, "file_size": row.file_size}


@router.get("/{case_id}/timeline", response_model=list[CaseTimelineRead])
def timeline(case_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[CaseTimeline]:
    return list(db.execute(select(CaseTimeline).where(CaseTimeline.case_id == case_id).order_by(CaseTimeline.timestamp.desc())).scalars().all())


@router.get("/{case_id}/alerts")
def linked_alerts(case_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    alerts = db.execute(select(Alert).where(Alert.case_id == case_id).order_by(Alert.created_at.desc())).scalars().all()
    return [{"id": a.id, "title": a.title, "severity": a.severity, "status": a.status, "priority_score": a.priority_score} for a in alerts]
