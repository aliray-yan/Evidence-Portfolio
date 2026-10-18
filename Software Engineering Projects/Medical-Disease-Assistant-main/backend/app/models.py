"""
SQLAlchemy Database Models
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Date, Time,
    ForeignKey, Enum, Numeric, JSON, func
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PATIENT = "patient"
    DOCTOR = "doctor"


class Gender(str, enum.Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    """Base user model for all user types"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    address = Column(Text, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PATIENT)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    patient = relationship("Patient", back_populates="user", uselist=False)
    doctor = relationship("Doctor", back_populates="user", uselist=False)


class Patient(Base):
    """Extended patient information"""
    __tablename__ = "patients"

    patient_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True)
    medical_history_notes = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    blood_group = Column(String(10), nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="patient")
    predictions = relationship("DiseasePrediction", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    referrals = relationship("DoctorReferral", back_populates="patient")


class Doctor(Base):
    """Extended doctor information"""
    __tablename__ = "doctors"

    doctor_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True)
    specialty = Column(String(100), nullable=False)
    qualifications = Column(Text, nullable=True)
    experience_years = Column(Integer, default=0)
    consultation_fee = Column(Numeric(10, 2), default=0.00)
    availability_schedule = Column(JSON, nullable=True)
    rating = Column(Numeric(3, 2), default=0.00)
    total_ratings = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    referrals = relationship("DoctorReferral", back_populates="doctor")


class DiseasePrediction(Base):
    """Disease prediction records"""
    __tablename__ = "disease_predictions"

    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"))
    symptoms_selected = Column(JSON, nullable=False)
    predicted_disease = Column(String(255), nullable=False)
    confidence_score = Column(Numeric(5, 4), nullable=False)
    model_version = Column(String(50), default="v1.0")
    recommended_specialist = Column(String(100), nullable=True)
    prediction_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="predictions")
    referral = relationship("DoctorReferral", back_populates="prediction", uselist=False)


class Appointment(Base):
    """Appointment booking records"""
    __tablename__ = "appointments"

    appointment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"))
    doctor_id = Column(Integer, ForeignKey("doctors.doctor_id", ondelete="CASCADE"))
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    prediction_id = Column(Integer, ForeignKey("disease_predictions.prediction_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")


class DoctorReferral(Base):
    """Doctor referral records from predictions"""
    __tablename__ = "doctor_referrals"

    referral_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prediction_id = Column(Integer, ForeignKey("disease_predictions.prediction_id", ondelete="CASCADE"))
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"))
    doctor_id = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=True)
    referral_reason = Column(Text, nullable=True)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    prediction = relationship("DiseasePrediction", back_populates="referral")
    patient = relationship("Patient", back_populates="referrals")
    doctor = relationship("Doctor", back_populates="referrals")