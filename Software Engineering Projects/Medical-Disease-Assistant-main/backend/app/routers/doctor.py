"""
Doctor Router - Doctor Dashboard, Appointments, Patient Management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, date
from typing import List, Optional
from app.database import get_db
from app.models import (
    User, Patient, Doctor, DiseasePrediction, Appointment, 
    AppointmentStatus
)
from app.schemas import (
    DoctorDashboard, AppointmentUpdate, AppointmentWithDetails,
    DoctorUpdate
)
from app.dependencies import get_current_doctor, get_current_user

router = APIRouter(prefix="/api/doctor", tags=["Doctor"])


@router.get("/dashboard", response_model=DoctorDashboard)
async def get_doctor_dashboard(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get doctor dashboard data"""
    
    today = datetime.utcnow().date()
    
    # Get unique patients
    total_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
        Appointment.doctor_id == doctor.doctor_id
    ).scalar() or 0
    
    # Today's appointments
    appointments_today = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.doctor_id,
        Appointment.appointment_date == today
    ).count()
    
    # Pending appointments
    pending_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.doctor_id,
        Appointment.status == AppointmentStatus.PENDING
    ).count()
    
    # Upcoming appointments (next 7 days)
    upcoming = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.doctor_id,
        Appointment.appointment_date >= today,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).order_by(
        Appointment.appointment_date, 
        Appointment.appointment_time
    ).limit(10).all()
    
    # Recent patients, ordered by each patient's latest appointment with this doctor.
    recent_patient_rows = db.query(
        Appointment.patient_id,
        func.max(Appointment.created_at).label("latest_appointment_created_at")
    ).filter(
        Appointment.doctor_id == doctor.doctor_id
    ).group_by(
        Appointment.patient_id
    ).order_by(
        desc(func.max(Appointment.created_at))
    ).limit(10).all()
    
    recent_patients = []
    for patient_id, _ in recent_patient_rows:
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if patient:
            # Get latest prediction
            latest_pred = db.query(DiseasePrediction).filter(
                DiseasePrediction.patient_id == patient_id
            ).order_by(desc(DiseasePrediction.prediction_date)).first()
            
            recent_patients.append({
                "patient_id": patient.patient_id,
                "full_name": patient.user.full_name,
                "email": patient.user.email,
                "phone": patient.user.phone,
                "latest_disease": latest_pred.predicted_disease if latest_pred else None,
                "last_visit": db.query(func.max(Appointment.appointment_date)).filter(
                    Appointment.patient_id == patient_id,
                    Appointment.doctor_id == doctor.doctor_id,
                    Appointment.status == AppointmentStatus.COMPLETED
                ).scalar()
            })
    
    return {
        "doctor_info": {
            "doctor_id": doctor.doctor_id,
            "full_name": doctor.user.full_name,
            "email": doctor.user.email,
            "specialty": doctor.specialty,
            "rating": float(doctor.rating),
            "is_verified": doctor.is_verified
        },
        "total_patients": total_patients,
        "appointments_today": appointments_today,
        "pending_appointments": pending_appointments,
        "upcoming_appointments": [
            {
                "appointment_id": apt.appointment_id,
                "date": apt.appointment_date.isoformat(),
                "time": apt.appointment_time.isoformat(),
                "patient_name": apt.patient.user.full_name,
                "patient_phone": apt.patient.user.phone,
                "reason": apt.reason,
                "status": apt.status.value
            } for apt in upcoming
        ],
        "recent_patients": recent_patients
    }


@router.get("/appointments", response_model=List[AppointmentWithDetails])
async def get_doctor_appointments(
    date_filter: Optional[date] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get doctor's appointments"""
    
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.doctor_id
    )
    
    if date_filter:
        query = query.filter(Appointment.appointment_date == date_filter)
    
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    
    appointments = query.order_by(
        Appointment.appointment_date,
        Appointment.appointment_time
    ).offset(skip).limit(limit).all()
    
    result = []
    for apt in appointments:
        # Get prediction if exists
        prediction = None
        if apt.prediction_id:
            pred = db.query(DiseasePrediction).filter(
                DiseasePrediction.prediction_id == apt.prediction_id
            ).first()
            if pred:
                prediction = pred.predicted_disease
        
        result.append({
            "appointment_id": apt.appointment_id,
            "patient_id": apt.patient_id,
            "doctor_id": apt.doctor_id,
            "appointment_date": apt.appointment_date,
            "appointment_time": apt.appointment_time,
            "status": apt.status,
            "reason": apt.reason,
            "notes": apt.notes,
            "created_at": apt.created_at,
            "patient_name": apt.patient.user.full_name,
            "patient_email": apt.patient.user.email,
            "patient_phone": apt.patient.user.phone,
            "doctor_name": doctor.user.full_name,
            "doctor_specialty": doctor.specialty,
            "predicted_disease": prediction
        })
    
    return result


@router.get("/appointments/today")
async def get_today_appointments(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get today's appointments"""
    
    today = datetime.utcnow().date()
    
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.doctor_id,
        Appointment.appointment_date == today
    ).order_by(Appointment.appointment_time).all()
    
    result = []
    for apt in appointments:
        # Get patient's latest prediction
        latest_pred = db.query(DiseasePrediction).filter(
            DiseasePrediction.patient_id == apt.patient_id
        ).order_by(desc(DiseasePrediction.prediction_date)).first()
        
        result.append({
            "appointment_id": apt.appointment_id,
            "time": apt.appointment_time.isoformat(),
            "patient_id": apt.patient_id,
            "patient_name": apt.patient.user.full_name,
            "patient_email": apt.patient.user.email,
            "patient_phone": apt.patient.user.phone,
            "reason": apt.reason,
            "status": apt.status.value,
            "predicted_disease": latest_pred.predicted_disease if latest_pred else None,
            "symptoms": latest_pred.symptoms_selected if latest_pred else []
        })
    
    return result


@router.put("/appointments/{appointment_id}", response_model=AppointmentWithDetails)
async def update_appointment(
    appointment_id: int,
    update_data: AppointmentUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Update appointment status or details"""
    
    appointment = db.query(Appointment).filter(
        Appointment.appointment_id == appointment_id,
        Appointment.doctor_id == doctor.doctor_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Update fields
    if update_data.status:
        appointment.status = update_data.status
    if update_data.notes:
        appointment.notes = update_data.notes
    if update_data.appointment_date:
        appointment.appointment_date = update_data.appointment_date
    if update_data.appointment_time:
        appointment.appointment_time = update_data.appointment_time
    
    db.commit()
    db.refresh(appointment)
    
    # Get prediction
    prediction = None
    if appointment.prediction_id:
        pred = db.query(DiseasePrediction).filter(
            DiseasePrediction.prediction_id == appointment.prediction_id
        ).first()
        if pred:
            prediction = pred.predicted_disease
    
    return {
        "appointment_id": appointment.appointment_id,
        "patient_id": appointment.patient_id,
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "status": appointment.status,
        "reason": appointment.reason,
        "notes": appointment.notes,
        "created_at": appointment.created_at,
        "patient_name": appointment.patient.user.full_name,
        "patient_email": appointment.patient.user.email,
        "patient_phone": appointment.patient.user.phone,
        "doctor_name": doctor.user.full_name,
        "doctor_specialty": doctor.specialty,
        "predicted_disease": prediction
    }


@router.get("/patients")
async def get_doctor_patients(
    skip: int = 0,
    limit: int = 50,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get all patients who have appointments with this doctor"""
    
    # Get unique patient IDs
    patient_ids = db.query(Appointment.patient_id).filter(
        Appointment.doctor_id == doctor.doctor_id
    ).distinct().all()
    
    patients = []
    for (patient_id,) in patient_ids[skip:skip+limit]:
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if patient:
            # Get appointment count
            appointment_count = db.query(Appointment).filter(
                Appointment.patient_id == patient_id,
                Appointment.doctor_id == doctor.doctor_id
            ).count()
            
            # Get latest prediction
            latest_pred = db.query(DiseasePrediction).filter(
                DiseasePrediction.patient_id == patient_id
            ).order_by(desc(DiseasePrediction.prediction_date)).first()
            
            # Get last appointment
            last_apt = db.query(Appointment).filter(
                Appointment.patient_id == patient_id,
                Appointment.doctor_id == doctor.doctor_id
            ).order_by(desc(Appointment.appointment_date)).first()
            
            patients.append({
                "patient_id": patient.patient_id,
                "full_name": patient.user.full_name,
                "email": patient.user.email,
                "phone": patient.user.phone,
                "blood_group": patient.blood_group,
                "allergies": patient.allergies,
                "total_appointments": appointment_count,
                "last_appointment": last_apt.appointment_date.isoformat() if last_apt else None,
                "latest_prediction": {
                    "disease": latest_pred.predicted_disease,
                    "confidence": float(latest_pred.confidence_score),
                    "date": latest_pred.prediction_date.isoformat()
                } if latest_pred else None
            })
    
    return patients


@router.get("/patient/{patient_id}/history")
async def get_patient_history(
    patient_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get a specific patient's medical history (only if they have appointments with this doctor)"""
    
    # Verify patient has appointments with this doctor
    has_appointment = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor.doctor_id
    ).first()
    
    if not has_appointment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this patient's history"
        )
    
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Get all predictions
    predictions = db.query(DiseasePrediction).filter(
        DiseasePrediction.patient_id == patient_id
    ).order_by(desc(DiseasePrediction.prediction_date)).all()
    
    # Get appointments with this doctor
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor.doctor_id
    ).order_by(desc(Appointment.appointment_date)).all()
    
    return {
        "patient_info": {
            "patient_id": patient.patient_id,
            "full_name": patient.user.full_name,
            "email": patient.user.email,
            "phone": patient.user.phone,
            "date_of_birth": patient.user.date_of_birth.isoformat() if patient.user.date_of_birth else None,
            "gender": patient.user.gender.value if patient.user.gender else None,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
            "medical_history_notes": patient.medical_history_notes,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone
        },
        "predictions": [
            {
                "prediction_id": pred.prediction_id,
                "disease": pred.predicted_disease,
                "confidence": float(pred.confidence_score),
                "symptoms": pred.symptoms_selected,
                "specialist": pred.recommended_specialist,
                "date": pred.prediction_date.isoformat()
            } for pred in predictions
        ],
        "appointments": [
            {
                "appointment_id": apt.appointment_id,
                "date": apt.appointment_date.isoformat(),
                "time": apt.appointment_time.isoformat(),
                "status": apt.status.value,
                "reason": apt.reason,
                "notes": apt.notes
            } for apt in appointments
        ]
    }


@router.put("/profile")
async def update_doctor_profile(
    update_data: DoctorUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Update doctor profile information"""
    
    if update_data.specialty:
        doctor.specialty = update_data.specialty
    if update_data.qualifications:
        doctor.qualifications = update_data.qualifications
    if update_data.experience_years is not None:
        doctor.experience_years = update_data.experience_years
    if update_data.consultation_fee is not None:
        doctor.consultation_fee = update_data.consultation_fee
    if update_data.bio:
        doctor.bio = update_data.bio
    if update_data.availability_schedule:
        doctor.availability_schedule = update_data.availability_schedule
    
    db.commit()
    
    return {"message": "Profile updated successfully"}


@router.put("/availability")
async def update_availability(
    schedule: dict,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Update doctor availability schedule"""
    
    doctor.availability_schedule = schedule
    db.commit()
    
    return {"message": "Availability updated successfully"}
