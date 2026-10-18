"""
FastAPI Dependencies for authentication and authorization
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Patient, Doctor
from app.auth import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = decode_token(token)
    
    user = db.query(User).filter(User.user_id == token_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    return user


def require_role(allowed_roles: List[str]):
    """Dependency factory to require specific roles"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker


async def get_current_admin(
    current_user: User = Depends(require_role(["admin"]))
) -> User:
    """Get current admin user"""
    return current_user


async def get_current_patient(
    current_user: User = Depends(require_role(["patient"])),
    db: Session = Depends(get_db)
) -> Patient:
    """Get current patient with patient profile"""
    patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    return patient


async def get_current_doctor(
    current_user: User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
) -> Doctor:
    """Get current doctor with doctor profile"""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.user_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return doctor