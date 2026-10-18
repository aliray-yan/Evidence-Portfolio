from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database import get_db
from app.models.user import AuditLog, User, UserRole
from app.schemas.user import AuditLogRead, UserRead, UserUpdate
from app.utils.security import hash_password


router = APIRouter()


@router.get("", response_model=list[UserRead])
def list_users(
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST)),
    db: Session = Depends(get_db),
    q: str | None = None,
) -> list[User]:
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        stmt = stmt.where(User.email.contains(q) | User.full_name.contains(q))
    return list(db.execute(stmt).scalars().all())


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if current_user.role not in {UserRole.ADMIN, UserRole.SENIOR_ANALYST} and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    password = updates.pop("password", None)
    for field, value in updates.items():
        setattr(user, field, value.lower() if field == "email" else value)
    if password:
        user.password_hash = hash_password(password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, _: User = Depends(require_roles(UserRole.ADMIN)), db: Session = Depends(get_db)) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()


@router.get("/{user_id}/activity", response_model=list[AuditLogRead])
def user_activity(
    user_id: str,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST)),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[AuditLog]:
    return list(db.execute(select(AuditLog).where(AuditLog.user_id == user_id).order_by(AuditLog.timestamp.desc()).limit(limit)).scalars().all())
