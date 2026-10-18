from datetime import timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import AuditLog, User, UserRole, UserSession
from app.schemas.user import UserCreate
from app.utils.helpers import now_utc
from app.utils.security import create_access_token, create_refresh_token, hash_password, verify_password


DEFAULT_PASSWORD = "SecureOps!2026"


def log_audit(db: Session, user_id: str | None, action: str, request: Request | None = None, details: dict | None = None) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            ip_address=request.client.host if request and request.client else None,
            details=details or {},
        )
    )


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()


def create_user(db: Session, payload: UserCreate) -> User:
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    return user


def authenticate(db: Session, email: str, password: str, request: Request | None = None) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash) or not user.is_active:
        log_audit(db, user.id if user else None, "failed_login", request, {"email": email})
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.last_login = now_utc()
    log_audit(db, user.id, "login", request)
    return user


def issue_tokens(db: Session, user: User, request: Request | None = None) -> tuple[str, str]:
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=now_utc() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(session)
    db.flush()
    return access_token, refresh_token


def ensure_default_users(db: Session) -> None:
    existing = db.execute(select(User.id).limit(1)).first()
    if existing:
        return
    users = [
        UserCreate(email="admin@secureops.local", password=DEFAULT_PASSWORD, full_name="SOC Administrator", role=UserRole.ADMIN),
        UserCreate(email="senior@secureops.local", password=DEFAULT_PASSWORD, full_name="Maya Senior Analyst", role=UserRole.SENIOR_ANALYST),
        UserCreate(email="analyst1@secureops.local", password=DEFAULT_PASSWORD, full_name="Aiden Malware Analyst", role=UserRole.ANALYST),
        UserCreate(email="analyst2@secureops.local", password=DEFAULT_PASSWORD, full_name="Noor Incident Analyst", role=UserRole.ANALYST),
        UserCreate(email="viewer@secureops.local", password=DEFAULT_PASSWORD, full_name="Executive Viewer", role=UserRole.VIEWER),
    ]
    for payload in users:
        create_user(db, payload)
    db.commit()
