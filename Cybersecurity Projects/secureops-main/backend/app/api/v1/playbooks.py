from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_analyst
from app.database import get_db
from app.models.playbook import ExecutionStatus, Playbook, PlaybookExecution, PlaybookExecutionStep, PlaybookStep, StepExecutionStatus, StepType
from app.models.user import User
from app.schemas.playbook import (
    ExecutionStepUpdate,
    PlaybookCreate,
    PlaybookExecuteRequest,
    PlaybookExecutionRead,
    PlaybookRead,
    PlaybookStepCreate,
    PlaybookUpdate,
)
from app.services.playbook_service import PLAYBOOK_TEMPLATES, create_playbook, start_execution
from app.services.playbook_automation import automation_actions, run_automation_step
from app.utils.helpers import now_utc


router = APIRouter()


@router.get("/templates")
def templates(_: User = Depends(get_current_user)) -> list[dict]:
    return PLAYBOOK_TEMPLATES


@router.get("/automation-actions")
def list_automation_actions(_: User = Depends(get_current_user)) -> list[dict]:
    return automation_actions()


@router.get("", response_model=list[PlaybookRead])
def list_playbooks(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Playbook]:
    return list(db.execute(select(Playbook).options(selectinload(Playbook.steps)).order_by(Playbook.name)).scalars().all())


@router.post("", response_model=PlaybookRead, status_code=status.HTTP_201_CREATED)
def create(payload: PlaybookCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Playbook:
    return create_playbook(db, payload, current_user.id)


@router.get("/{playbook_id}", response_model=PlaybookRead)
def get_playbook(playbook_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Playbook:
    playbook = db.execute(select(Playbook).options(selectinload(Playbook.steps)).where(Playbook.id == playbook_id)).scalar_one_or_none()
    if not playbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found")
    return playbook


@router.put("/{playbook_id}", response_model=PlaybookRead)
def update(playbook_id: str, payload: PlaybookUpdate, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> Playbook:
    playbook = db.execute(select(Playbook).options(selectinload(Playbook.steps)).where(Playbook.id == playbook_id)).scalar_one_or_none()
    if not playbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found")
    updates = payload.model_dump(exclude_unset=True)
    steps = updates.pop("steps", None)
    for field, value in updates.items():
        setattr(playbook, field, value)
    if steps is not None:
        for existing in list(playbook.steps):
            db.delete(existing)
        db.flush()
        for step in steps:
            db.add(PlaybookStep(playbook_id=playbook.id, **PlaybookStepCreate.model_validate(step).model_dump()))
    playbook.version += 1
    db.commit()
    db.refresh(playbook)
    return get_playbook(playbook_id, db, _)


@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(playbook_id: str, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> None:
    playbook = db.get(Playbook, playbook_id)
    if not playbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found")
    db.delete(playbook)
    db.commit()


@router.post("/{playbook_id}/execute", response_model=PlaybookExecutionRead)
def execute(playbook_id: str, payload: PlaybookExecuteRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> PlaybookExecution:
    playbook = db.execute(select(Playbook).options(selectinload(Playbook.steps)).where(Playbook.id == playbook_id)).scalar_one_or_none()
    if not playbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found")
    return start_execution(db, playbook, current_user.id, payload.alert_id, payload.case_id)


@router.get("/{playbook_id}/executions", response_model=list[PlaybookExecutionRead])
def executions(playbook_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[PlaybookExecution]:
    return list(
        db.execute(
            select(PlaybookExecution)
            .options(selectinload(PlaybookExecution.steps))
            .where(PlaybookExecution.playbook_id == playbook_id)
            .order_by(PlaybookExecution.started_at.desc())
        )
        .scalars()
        .all()
    )


def _load_execution(db: Session, execution_id: str) -> PlaybookExecution:
    execution = db.execute(
        select(PlaybookExecution)
        .options(selectinload(PlaybookExecution.steps).selectinload(PlaybookExecutionStep.step))
        .where(PlaybookExecution.id == execution_id)
    ).scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution


def _find_execution_step(execution: PlaybookExecution, step_id: str) -> PlaybookExecutionStep:
    row = next((item for item in execution.steps if item.step_id == step_id or item.id == step_id), None)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")
    return row


async def _apply_step_update(
    db: Session,
    execution: PlaybookExecution,
    row: PlaybookExecutionStep,
    payload: ExecutionStepUpdate,
    current_user: User,
) -> PlaybookExecution:
    row.status = payload.status
    row.notes = payload.notes
    row.evidence = payload.evidence or {}
    row.skip_reason = payload.skip_reason
    if payload.status == StepExecutionStatus.IN_PROGRESS and not row.started_at:
        row.started_at = now_utc()
    if payload.status == StepExecutionStatus.COMPLETED and row.step.step_type == StepType.AUTOMATED:
        try:
            row.evidence = {**row.evidence, "automation": await run_automation_step(db, execution, row, current_user)}
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if payload.status in {StepExecutionStatus.COMPLETED, StepExecutionStatus.SKIPPED}:
        row.completed_at = now_utc()
        row.completed_by_id = current_user.id
    if all(step.status in {StepExecutionStatus.COMPLETED, StepExecutionStatus.SKIPPED} for step in execution.steps):
        execution.status = ExecutionStatus.COMPLETED
        execution.completed_at = now_utc()
    db.commit()
    db.refresh(execution)
    return execution


@router.put("/executions/{execution_id}/step/{step_id}", response_model=PlaybookExecutionRead)
async def update_step(
    execution_id: str,
    step_id: str,
    payload: ExecutionStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
) -> PlaybookExecution:
    execution = _load_execution(db, execution_id)
    row = _find_execution_step(execution, step_id)
    return await _apply_step_update(db, execution, row, payload, current_user)


@router.post("/executions/{execution_id}/step/{step_id}/run", response_model=PlaybookExecutionRead)
async def run_step_automation(
    execution_id: str,
    step_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
) -> PlaybookExecution:
    execution = _load_execution(db, execution_id)
    row = _find_execution_step(execution, step_id)
    return await _apply_step_update(
        db,
        execution,
        row,
        ExecutionStepUpdate(status=StepExecutionStatus.COMPLETED, evidence=row.evidence or {}),
        current_user,
    )
