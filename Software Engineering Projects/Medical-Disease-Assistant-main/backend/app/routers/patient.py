"""
Patient Router - Patient Dashboard, Symptom Checker, Appointments
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.models import (
    User, Patient, Doctor, DiseasePrediction, Appointment, 
    DoctorReferral, AppointmentStatus
)
from app.schemas import (
    PatientDashboard, SymptomInput, PredictionResult, PredictionResponse,
    AppointmentCreate, AppointmentResponse, AppointmentWithDetails,
    DoctorListResponse, ReferralCreate, UserUpdate
)
from app.dependencies import get_current_patient, get_current_user
from app.ml.predict import predict_disease, get_available_symptoms
import json

router = APIRouter(prefix="/api/patient", tags=["Patient"])


@router.get("/dashboard", response_model=PatientDashboard)
async def get_patient_dashboard(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Get patient dashboard data"""
    
    # Count predictions and appointments
    total_predictions = db.query(DiseasePrediction).filter(
        DiseasePrediction.patient_id == patient.patient_id
    ).count()
    
    total_appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.patient_id
    ).count()
    
    # Get upcoming appointments
    upcoming_appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.patient_id,
        Appointment.appointment_date >= datetime.utcnow().date(),
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).order_by(Appointment.appointment_date, Appointment.appointment_time).limit(5).all()
    
    # Get recent predictions
    recent_predictions = db.query(DiseasePrediction).filter(
        DiseasePrediction.patient_id == patient.patient_id
    ).order_by(desc(DiseasePrediction.prediction_date)).limit(5).all()
    
    is_new_patient = total_predictions == 0 and total_appointments == 0
    
    return {
        "patient_info": {
            "patient_id": patient.patient_id,
            "full_name": patient.user.full_name,
            "email": patient.user.email,
            "phone": patient.user.phone,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies
        },
        "total_predictions": total_predictions,
        "total_appointments": total_appointments,
        "upcoming_appointments": [
            {
                "appointment_id": apt.appointment_id,
                "date": apt.appointment_date.isoformat(),
                "time": apt.appointment_time.isoformat(),
                "doctor_name": apt.doctor.user.full_name,
                "doctor_specialty": apt.doctor.specialty,
                "status": apt.status.value,
                "reason": apt.reason
            } for apt in upcoming_appointments
        ],
        "recent_predictions": [
            {
                "prediction_id": pred.prediction_id,
                "disease": pred.predicted_disease,
                "confidence": float(pred.confidence_score),
                "date": pred.prediction_date.isoformat(),
                "specialist": pred.recommended_specialist
            } for pred in recent_predictions
        ],
        "is_new_patient": is_new_patient
    }


@router.get("/symptoms")
async def get_symptoms_list(
    patient: Patient = Depends(get_current_patient)
):
    """Get list of all available symptoms"""
    symptoms = get_available_symptoms()
    return {
        "symptoms": symptoms,
        "total": len(symptoms)
    }


@router.post("/predict", response_model=PredictionResult)
async def predict_patient_disease(
    input_data: SymptomInput,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Predict disease based on symptoms and save to history"""
    
    # Get prediction from ML model
    result = predict_disease(input_data.symptoms)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Prediction failed")
        )
    
    # Save prediction to database
    new_prediction = DiseasePrediction(
        patient_id=patient.patient_id,
        symptoms_selected=result["symptoms_matched"],
        predicted_disease=result["disease"],
        confidence_score=result["confidence"],
        recommended_specialist=result["specialist"],
        model_version="v1.0",
        prediction_date=datetime.utcnow()
    )
    
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)
    
    # Add prediction_id to result
    result["prediction_id"] = new_prediction.prediction_id
    
    return result


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    skip: int = 0,
    limit: int = 20,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Get patient's prediction history"""
    
    predictions = db.query(DiseasePrediction).filter(
        DiseasePrediction.patient_id == patient.patient_id
    ).order_by(desc(DiseasePrediction.prediction_date)).offset(skip).limit(limit).all()
    
    return predictions


@router.get("/prediction/{prediction_id}")
async def get_prediction_details(
    prediction_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Get details of a specific prediction"""
    
    prediction = db.query(DiseasePrediction).filter(
        DiseasePrediction.prediction_id == prediction_id,
        DiseasePrediction.patient_id == patient.patient_id
    ).first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    
    # Check for referral and appointment
    referral = db.query(DoctorReferral).filter(
        DoctorReferral.prediction_id == prediction_id
    ).first()
    
    appointment = db.query(Appointment).filter(
        Appointment.prediction_id == prediction_id
    ).first()
    
    return {
        "prediction_id": prediction.prediction_id,
        "symptoms_selected": prediction.symptoms_selected,
        "predicted_disease": prediction.predicted_disease,
        "confidence_score": float(prediction.confidence_score),
        "recommended_specialist": prediction.recommended_specialist,
        "prediction_date": prediction.prediction_date.isoformat(),
        "has_referral": referral is not None,
        "has_appointment": appointment is not None,
        "appointment_details": {
            "appointment_id": appointment.appointment_id,
            "date": appointment.appointment_date.isoformat(),
            "time": appointment.appointment_time.isoformat(),
            "status": appointment.status.value
        } if appointment else None
    }


@router.get("/doctors", response_model=List[DoctorListResponse])
async def browse_doctors(
    specialty: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Browse available doctors"""
    
    query = db.query(Doctor).join(User).filter(
        Doctor.is_verified == True,
        User.is_active == True
    )
    
    if specialty:
        query = query.filter(Doctor.specialty.ilike(f"%{specialty}%"))
    
    doctors = query.order_by(desc(Doctor.rating)).offset(skip).limit(limit).all()
    
    result = []
    for doctor in doctors:
        result.append({
            "doctor_id": doctor.doctor_id,
            "full_name": doctor.user.full_name,
            "email": doctor.user.email,
            "specialty": doctor.specialty,
            "experience_years": doctor.experience_years,
            "consultation_fee": float(doctor.consultation_fee),
            "rating": float(doctor.rating),
            "total_ratings": doctor.total_ratings,
            "is_verified": doctor.is_verified,
            "bio": doctor.bio,
            "availability_schedule": doctor.availability_schedule
        })
    
    return result


@router.get("/doctors/{doctor_id}")
async def get_doctor_details(
    doctor_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Get detailed information about a doctor"""
    
    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Get appointment count
    appointment_count = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    return {
        "doctor_id": doctor.doctor_id,
        "full_name": doctor.user.full_name,
        "email": doctor.user.email,
        "phone": doctor.user.phone,
        "specialty": doctor.specialty,
        "qualifications": doctor.qualifications,
        "experience_years": doctor.experience_years,
        "consultation_fee": float(doctor.consultation_fee),
        "rating": float(doctor.rating),
        "total_ratings": doctor.total_ratings,
        "is_verified": doctor.is_verified,
        "bio": doctor.bio,
        "availability_schedule": doctor.availability_schedule,
        "total_consultations": appointment_count
    }


@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    appointment_data: AppointmentCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Book an appointment with a doctor"""
    
    # Verify doctor exists
    doctor = db.query(Doctor).filter(
        Doctor.doctor_id == appointment_data.doctor_id
    ).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Check for conflicting appointments
    existing_appointment = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.appointment_date == appointment_data.appointment_date,
        Appointment.appointment_time == appointment_data.appointment_time,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot is already booked"
        )
    
    # Create appointment
    new_appointment = Appointment(
        patient_id=patient.patient_id,
        doctor_id=appointment_data.doctor_id,
        appointment_date=appointment_data.appointment_date,
        appointment_time=appointment_data.appointment_time,
        status=AppointmentStatus.PENDING,
        reason=appointment_data.reason,
        notes=appointment_data.notes,
        prediction_id=appointment_data.prediction_id,
        created_at=datetime.utcnow()
    )
    
    db.add(new_appointment)
    
    # If there's a prediction_id, create a referral
    if appointment_data.prediction_id:
        prediction = db.query(DiseasePrediction).filter(
            DiseasePrediction.prediction_id == appointment_data.prediction_id
        ).first()
        
        if prediction:
            referral = DoctorReferral(
                prediction_id=prediction.prediction_id,
                patient_id=patient.patient_id,
                doctor_id=appointment_data.doctor_id,
                referral_reason=f"Predicted disease: {prediction.predicted_disease}",
                is_booked=True,
                created_at=datetime.utcnow()
            )
            db.add(referral)
    
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment


@router.get("/appointments", response_model=List[AppointmentWithDetails])
async def get_patient_appointments(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Get patient's appointment history"""
    
    query = db.query(Appointment).filter(
        Appointment.patient_id == patient.patient_id
    )
    
    if status:
        query = query.filter(Appointment.status == status)
    
    appointments = query.order_by(
        desc(Appointment.appointment_date)
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
            "patient_name": patient.user.full_name,
            "patient_email": patient.user.email,
            "patient_phone": patient.user.phone,
            "doctor_name": apt.doctor.user.full_name,
            "doctor_specialty": apt.doctor.specialty,
            "predicted_disease": prediction
        })
    
    return result


@router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Cancel an appointment"""
    
    appointment = db.query(Appointment).filter(
        Appointment.appointment_id == appointment_id,
        Appointment.patient_id == patient.patient_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed appointment"
        )
    
    appointment.status = AppointmentStatus.CANCELLED
    db.commit()
    
    return {"message": "Appointment cancelled successfully"}


@router.put("/profile")
async def update_patient_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Update patient profile information"""
    
    # Update user fields
    if update_data.full_name:
        current_user.full_name = update_data.full_name
    if update_data.phone:
        current_user.phone = update_data.phone
    if update_data.date_of_birth:
        current_user.date_of_birth = update_data.date_of_birth
    if update_data.gender:
        current_user.gender = update_data.gender
    if update_data.address:
        current_user.address = update_data.address
    
    db.commit()
    
    return {"message": "Profile updated successfully"}