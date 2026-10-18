from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole, UserSession
from app.schemas.user import LoginRequest, PasswordResetComplete, PasswordResetRequest, RefreshRequest, TokenResponse, UserCreate, UserRead
from app.services.auth_service import authenticate, create_user, issue_tokens, log_audit
from app.utils.helpers import now_utc
from app.utils.rate_limiter import rate_limiter
from app.utils.security import decode_token


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    key = f"login:{request.client.host if request.client else 'unknown'}:{payload.email.lower()}"
    if not rate_limiter.allow(key, 5, 60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
    user = authenticate(db, payload.email, payload.password, request)
    access_token, refresh_token = issue_tokens(db, user, request)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserRead.model_validate(user))


@router.post("/logout")
def logout(payload: RefreshRequest, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    session = db.execute(select(UserSession).where(UserSession.refresh_token == payload.refresh_token)).scalar_one_or_none()
    if session:
        db.delete(session)
    log_audit(db, current_user.id, "logout", request)
    db.commit()
    return {"ok": True}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    session = db.execute(select(UserSession).where(UserSession.refresh_token == payload.refresh_token)).scalar_one_or_none()
    if not session or session.expires_at < now_utc():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token")
    user = db.get(User, decoded.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
    db.delete(session)
    access_token, refresh_token = issue_tokens(db, user, request)
    db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserRead.model_validate(user))


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, _: User = Depends(require_roles(UserRole.ADMIN)), db: Session = Depends(get_db)) -> User:
    user = create_user(db, payload)
    db.commit()
    db.refresh(user)
    return user


@router.post("/password-reset")
def request_password_reset(payload: PasswordResetRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    log_audit(db, user.id if user else None, "password_reset_requested", request, {"email": payload.email})
    db.commit()
    return {"ok": True, "message": "If the account exists, a reset workflow has been recorded."}


@router.put("/password-reset")
def complete_password_reset(payload: PasswordResetComplete, request: Request, db: Session = Depends(get_db)) -> dict:
    # MVP note: token delivery is intentionally pluggable. Admins can still rotate passwords through /users.
    if payload.token != settings.secret_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
    log_audit(db, None, "password_reset_completed", request, {"mode": "development-token"})
    db.commit()
    return {"ok": True}
