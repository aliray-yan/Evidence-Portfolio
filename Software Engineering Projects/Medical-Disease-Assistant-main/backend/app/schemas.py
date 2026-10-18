"""
Pydantic Schemas for Request/Response Validation
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Any
from datetime import datetime, date, time
from enum import Enum


# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    PATIENT = "patient"
    DOCTOR = "doctor"


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Authentication Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.PATIENT


class PatientRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class UserResponse(UserBase):
    user_id: int
    role: UserRole
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None


# Patient Schemas
class PatientBase(BaseModel):
    medical_history_notes: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientResponse(PatientBase):
    patient_id: int
    user_id: int
    created_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


class PatientWithHistory(PatientResponse):
    total_predictions: int = 0
    total_appointments: int = 0
    latest_prediction: Optional[dict] = None
    has_referral: bool = False


# Doctor Schemas
class DoctorBase(BaseModel):
    specialty: str
    qualifications: Optional[str] = None
    experience_years: Optional[int] = 0
    consultation_fee: Optional[float] = 0.00
    bio: Optional[str] = None


class DoctorCreate(DoctorBase):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone: Optional[str] = None


class DoctorUpdate(BaseModel):
    specialty: Optional[str] = None
    qualifications: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    bio: Optional[str] = None
    availability_schedule: Optional[dict] = None
    is_verified: Optional[bool] = None


class DoctorResponse(DoctorBase):
    doctor_id: int
    user_id: int
    rating: float
    total_ratings: int
    is_verified: bool
    created_at: datetime
    user: UserResponse
    availability_schedule: Optional[dict] = None

    class Config:
        from_attributes = True


class DoctorListResponse(BaseModel):
    doctor_id: int
    full_name: str
    email: str
    specialty: str
    experience_years: int
    consultation_fee: float
    rating: float
    total_ratings: int
    is_verified: bool
    bio: Optional[str] = None
    availability_schedule: Optional[dict] = None


# Prediction Schemas
class SymptomInput(BaseModel):
    symptoms: List[str] = Field(..., min_items=1)


class PredictionResult(BaseModel):
    disease: str
    confidence: float
    specialist: str
    symptoms_matched: List[str]
    recommendations: List[str]


class PredictionResponse(BaseModel):
    prediction_id: int
    patient_id: int
    symptoms_selected: List[str]
    predicted_disease: str
    confidence_score: float
    recommended_specialist: str
    prediction_date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PredictionWithPatient(PredictionResponse):
    patient_name: str
    patient_email: str
    has_referral: bool = False
    has_appointment: bool = False


# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = None
    notes: Optional[str] = None
    prediction_id: Optional[int] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentWithDetails(AppointmentResponse):
    patient_name: str
    patient_email: str
    patient_phone: Optional[str] = None
    doctor_name: str
    doctor_specialty: str
    predicted_disease: Optional[str] = None


# Referral Schemas
class ReferralCreate(BaseModel):
    prediction_id: int
    doctor_id: Optional[int] = None
    referral_reason: Optional[str] = None


class ReferralResponse(BaseModel):
    referral_id: int
    prediction_id: int
    patient_id: int
    doctor_id: Optional[int]
    referral_reason: Optional[str]
    is_booked: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReferralWithDetails(ReferralResponse):
    patient_name: str
    patient_email: str
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    predicted_disease: str
    prediction_date: datetime


# Analytics Schemas
class DashboardStats(BaseModel):
    total_patients: int
    total_doctors: int
    total_predictions: int
    total_appointments: int
    predictions_today: int
    appointments_today: int
    pending_appointments: int
    common_diseases: List[dict]
    recent_predictions: List[dict]
    monthly_stats: List[dict]


class PatientDashboard(BaseModel):
    patient_info: dict
    total_predictions: int
    total_appointments: int
    upcoming_appointments: List[dict]
    recent_predictions: List[dict]
    is_new_patient: bool


class DoctorDashboard(BaseModel):
    doctor_info: dict
    total_patients: int
    appointments_today: int
    pending_appointments: int
    upcoming_appointments: List[dict]
    recent_patients: List[dict]