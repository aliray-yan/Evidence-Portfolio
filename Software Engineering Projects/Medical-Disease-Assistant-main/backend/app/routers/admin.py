"""
Admin Router - Admin Dashboard and Management APIs
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Optional
from app.database import get_db
from app.models import (
    User, Patient, Doctor, DiseasePrediction, Appointment, 
    DoctorReferral, UserRole, AppointmentStatus
)
from app.schemas import (
    DashboardStats, DoctorCreate, DoctorUpdate, DoctorResponse,
    PatientWithHistory, PredictionWithPatient, ReferralWithDetails,
    UserResponse
)
from app.dependencies import get_current_admin
from app.auth import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""

    today = datetime.utcnow().date()

    # Basic counts
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    total_predictions = db.query(DiseasePrediction).count()
    total_appointments = db.query(Appointment).count()

    # Today's counts
    predictions_today = db.query(DiseasePrediction).filter(
        func.date(DiseasePrediction.prediction_date) == today
    ).count()

    appointments_today = db.query(Appointment).filter(
        Appointment.appointment_date == today
    ).count()

    pending_appointments = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.PENDING
    ).count()

    # Most common diseases
    common_diseases = db.query(
        DiseasePrediction.predicted_disease,
        func.count(DiseasePrediction.prediction_id).label('count')
    ).group_by(DiseasePrediction.predicted_disease).order_by(
        desc('count')
    ).limit(10).all()

    # Recent predictions
    recent_predictions = db.query(DiseasePrediction).join(
        Patient
    ).join(User).order_by(
        desc(DiseasePrediction.prediction_date)
    ).limit(10).all()

    # ===== FIXED MONTHLY STATS =====
    # Use explicit date boundaries to avoid accumulation bugs
    monthly_stats = []
    now = datetime.utcnow()

    for i in range(5, -1, -1):  # 5 months ago to current month (6 months total)
        # Calculate exact month boundaries
        year = now.year
        month = now.month - i

        # Handle year rollover
        while month <= 0:
            month += 12
            year -= 1

        # First day of this month
        month_start = datetime(year, month, 1)

        # First day of next month
        if month == 12:
            month_end = datetime(year + 1, 1, 1)
        else:
            month_end = datetime(year, month + 1, 1)

        # Count predictions in this month
        month_predictions = db.query(DiseasePrediction).filter(
            DiseasePrediction.prediction_date >= month_start,
            DiseasePrediction.prediction_date < month_end
        ).count()

        # Count appointments created in this month
        month_appointments = db.query(Appointment).filter(
            Appointment.created_at >= month_start,
            Appointment.created_at < month_end
        ).count()

        # Short month label like "Jan 2025"
        month_label = month_start.strftime("%b %Y")

        monthly_stats.append({
            "month": month_label,
            "predictions": month_predictions,
            "appointments": month_appointments
        })
    # ===== END FIXED MONTHLY STATS =====

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_predictions": total_predictions,
        "total_appointments": total_appointments,
        "predictions_today": predictions_today,
        "appointments_today": appointments_today,
        "pending_appointments": pending_appointments,
        "common_diseases": [
            {"disease": d[0], "count": d[1]} for d in common_diseases
        ],
        "recent_predictions": [
            {
                "prediction_id": p.prediction_id,
                "patient_name": p.patient.user.full_name,
                "disease": p.predicted_disease,
                "confidence": float(p.confidence_score),
                "date": p.prediction_date.isoformat()
            } for p in recent_predictions
        ],
        "monthly_stats": monthly_stats  # Already in correct order (oldest first)
    }


@router.get("/patients", response_model=List[PatientWithHistory])
async def get_all_patients(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all patients with their prediction history"""
    
    query = db.query(Patient).join(User)
    
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    patients = query.offset(skip).limit(limit).all()
    
    result = []
    for patient in patients:
        # Get prediction stats
        total_predictions = db.query(DiseasePrediction).filter(
            DiseasePrediction.patient_id == patient.patient_id
        ).count()
        
        total_appointments = db.query(Appointment).filter(
            Appointment.patient_id == patient.patient_id
        ).count()
        
        # Get latest prediction
        latest_pred = db.query(DiseasePrediction).filter(
            DiseasePrediction.patient_id == patient.patient_id
        ).order_by(desc(DiseasePrediction.prediction_date)).first()
        
        # Check for referrals
        has_referral = db.query(DoctorReferral).filter(
            DoctorReferral.patient_id == patient.patient_id
        ).first() is not None
        
        result.append({
            "patient_id": patient.patient_id,
            "user_id": patient.user_id,
            "medical_history_notes": patient.medical_history_notes,
            "allergies": patient.allergies,
            "blood_group": patient.blood_group,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "created_at": patient.created_at,
            "user": {
                "user_id": patient.user.user_id,
                "email": patient.user.email,
                "full_name": patient.user.full_name,
                "phone": patient.user.phone,
                "date_of_birth": patient.user.date_of_birth,
                "gender": patient.user.gender,
                "address": patient.user.address,
                "role": patient.user.role,
                "created_at": patient.user.created_at,
                "is_active": patient.user.is_active
            },
            "total_predictions": total_predictions,
            "total_appointments": total_appointments,
            "latest_prediction": {
                "disease": latest_pred.predicted_disease,
                "date": latest_pred.prediction_date.isoformat(),
                "confidence": float(latest_pred.confidence_score)
            } if latest_pred else None,
            "has_referral": has_referral
        })
    
    return result


@router.get("/doctors", response_model=List[DoctorResponse])
async def get_all_doctors(
    skip: int = 0,
    limit: int = 50,
    specialty: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all doctors"""
    
    query = db.query(Doctor).join(User)
    
    if specialty:
        query = query.filter(Doctor.specialty.ilike(f"%{specialty}%"))
    
    doctors = query.offset(skip).limit(limit).all()
    
    return doctors


@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doctor_data: DoctorCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new doctor account"""
    
    # Check if email exists
    if db.query(User).filter(User.email == doctor_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(doctor_data.password)
    
    new_user = User(
        email=doctor_data.email,
        password_hash=hashed_password,
        full_name=doctor_data.full_name,
        phone=doctor_data.phone,
        role=UserRole.DOCTOR,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create doctor profile
    new_doctor = Doctor(
        user_id=new_user.user_id,
        specialty=doctor_data.specialty,
        qualifications=doctor_data.qualifications,
        experience_years=doctor_data.experience_years or 0,
        consultation_fee=doctor_data.consultation_fee or 0.00,
        bio=doctor_data.bio,
        is_verified=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    
    return new_doctor


@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update doctor information"""
    
    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Update fields
    update_data = doctor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doctor, field, value)
    
    db.commit()
    db.refresh(doctor)
    
    return doctor


@router.delete("/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a doctor account"""
    
    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Delete user (cascades to doctor)
    user = db.query(User).filter(User.user_id == doctor.user_id).first()
    db.delete(user)
    db.commit()
    
    return {"message": "Doctor deleted successfully"}


@router.get("/predictions", response_model=List[PredictionWithPatient])
async def get_all_predictions(
    skip: int = 0,
    limit: int = 50,
    disease: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all disease predictions"""
    
    query = db.query(DiseasePrediction).join(Patient).join(User)
    
    if disease:
        query = query.filter(
            DiseasePrediction.predicted_disease.ilike(f"%{disease}%")
        )
    
    predictions = query.order_by(
        desc(DiseasePrediction.prediction_date)
    ).offset(skip).limit(limit).all()
    
    result = []
    for pred in predictions:
        # Check for referral and appointment
        referral = db.query(DoctorReferral).filter(
            DoctorReferral.prediction_id == pred.prediction_id
        ).first()
        
        appointment = db.query(Appointment).filter(
            Appointment.prediction_id == pred.prediction_id
        ).first()
        
        result.append({
            "prediction_id": pred.prediction_id,
            "patient_id": pred.patient_id,
            "symptoms_selected": pred.symptoms_selected,
            "predicted_disease": pred.predicted_disease,
            "confidence_score": float(pred.confidence_score),
            "recommended_specialist": pred.recommended_specialist,
            "prediction_date": pred.prediction_date,
            "notes": pred.notes,
            "patient_name": pred.patient.user.full_name,
            "patient_email": pred.patient.user.email,
            "has_referral": referral is not None,
            "has_appointment": appointment is not None
        })
    
    return result


@router.get("/referrals", response_model=List[ReferralWithDetails])
async def get_all_referrals(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all doctor referrals"""
    
    referrals = db.query(DoctorReferral).order_by(
        desc(DoctorReferral.created_at)
    ).offset(skip).limit(limit).all()
    
    result = []
    for ref in referrals:
        result.append({
            "referral_id": ref.referral_id,
            "prediction_id": ref.prediction_id,
            "patient_id": ref.patient_id,
            "doctor_id": ref.doctor_id,
            "referral_reason": ref.referral_reason,
            "is_booked": ref.is_booked,
            "created_at": ref.created_at,
            "patient_name": ref.patient.user.full_name,
            "patient_email": ref.patient.user.email,
            "doctor_name": ref.doctor.user.full_name if ref.doctor else None,
            "doctor_specialty": ref.doctor.specialty if ref.doctor else None,
            "predicted_disease": ref.prediction.predicted_disease,
            "prediction_date": ref.prediction.prediction_date
        })
    
    return result


@router.put("/patients/{patient_id}/status")
async def toggle_patient_status(
    patient_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a patient account"""
    
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    user = patient.user
    user.is_active = not user.is_active
    db.commit()
    
    return {
        "message": f"Patient account {'activated' if user.is_active else 'deactivated'}",
        "is_active": user.is_active
    }


@router.get("/analytics/diseases")
async def get_disease_analytics(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed disease analytics"""
    
    # Disease distribution
    disease_counts = db.query(
        DiseasePrediction.predicted_disease,
        func.count(DiseasePrediction.prediction_id).label('count')
    ).group_by(DiseasePrediction.predicted_disease).all()
    
    # Average confidence by disease
    avg_confidence = db.query(
        DiseasePrediction.predicted_disease,
        func.avg(DiseasePrediction.confidence_score).label('avg_confidence')
    ).group_by(DiseasePrediction.predicted_disease).all()
    
    return {
        "disease_distribution": [
            {"disease": d[0], "count": d[1]} for d in disease_counts
        ],
        "average_confidence": [
            {"disease": d[0], "confidence": float(d[1])} for d in avg_confidence
        ]
    }