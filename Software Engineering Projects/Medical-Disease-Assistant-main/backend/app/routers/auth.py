"""
Authentication Router - Login, Register, User Management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import User, Patient, UserRole
from app.schemas import (
    UserLogin, Token, PatientRegister, UserResponse
)
from app.auth import verify_password, get_password_hash, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_patient(patient_data: PatientRegister, db: Session = Depends(get_db)):
    """Register a new patient account"""
    
    # Check if email exists
    if db.query(User).filter(User.email == patient_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if phone exists (if provided)
    if patient_data.phone:
        if db.query(User).filter(User.phone == patient_data.phone).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    # Create user
    hashed_password = get_password_hash(patient_data.password)
    
    new_user = User(
        email=patient_data.email,
        password_hash=hashed_password,
        full_name=patient_data.full_name,
        phone=patient_data.phone,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        address=patient_data.address,
        role=UserRole.PATIENT,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create patient profile
    new_patient = Patient(
        user_id=new_user.user_id,
        blood_group=patient_data.blood_group,
        allergies=patient_data.allergies,
        emergency_contact_name=patient_data.emergency_contact_name,
        emergency_contact_phone=patient_data.emergency_contact_phone,
        created_at=datetime.utcnow()
    )
    
    db.add(new_patient)
    db.commit()
    
    # Generate token
    access_token = create_access_token(
        data={"user_id": new_user.user_id, "role": new_user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": new_user.user_id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role.value
        }
    }


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login for all user types"""
    
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact admin."
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate token
    access_token = create_access_token(
        data={"user_id": user.user_id, "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user (client should discard token)"""
    return {"message": "Successfully logged out"}