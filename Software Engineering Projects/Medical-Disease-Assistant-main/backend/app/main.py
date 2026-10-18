"""
Main FastAPI Application
Medical Diagnosis Assistant System
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.database import init_db, get_db, SessionLocal
from app.models import User, Patient, Doctor, UserRole
from app.auth import get_password_hash
from app.routers import auth_router, admin_router, patient_router, doctor_router
from app.ml.predict import load_model, get_available_symptoms
from app.ml.symptoms_list import SYMPTOMS_LIST

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("Starting Medical Diagnosis Assistant...")
    
    # Initialize database
    init_db()
    print("Database initialized")
    
    # Create default admin if not exists
    create_default_admin()
    
    # Create sample doctors if needed
    create_sample_doctors()
    
    # Try to load ML model
    try:
        load_model()
        print("ML Model loaded successfully")
    except FileNotFoundError:
        print("Warning: ML Model not found. Please run train_model.py first.")
    
    yield
    
    # Shutdown
    print("Shutting down...")


def create_default_admin():
    """Create default admin user if not exists"""
    db = SessionLocal()
    try:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@medical.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123")
        
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            admin = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                full_name="System Administrator",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Default admin created: {admin_email}")
        else:
            print(f"Admin already exists: {admin_email}")
    finally:
        db.close()


def create_sample_doctors():
    """Create sample doctors for testing"""
    db = SessionLocal()
    try:
        # Check if doctors exist
        if db.query(Doctor).count() > 0:
            return
        
        sample_doctors = [
            {
                "email": "dr.smith@medical.com",
                "password": "Doctor@123",
                "full_name": "Dr. John Smith",
                "phone": "1234567890",
                "specialty": "General Physician",
                "qualifications": "MBBS, MD",
                "experience_years": 10,
                "consultation_fee": 50.00,
                "bio": "Experienced general physician with expertise in primary care."
            },
            {
                "email": "dr.johnson@medical.com",
                "password": "Doctor@123",
                "full_name": "Dr. Emily Johnson",
                "phone": "1234567891",
                "specialty": "Cardiologist",
                "qualifications": "MBBS, MD, DM Cardiology",
                "experience_years": 15,
                "consultation_fee": 100.00,
                "bio": "Specialized in cardiovascular diseases and interventional cardiology."
            },
            {
                "email": "dr.williams@medical.com",
                "password": "Doctor@123",
                "full_name": "Dr. Michael Williams",
                "phone": "1234567892",
                "specialty": "Dermatologist",
                "qualifications": "MBBS, MD Dermatology",
                "experience_years": 8,
                "consultation_fee": 75.00,
                "bio": "Expert in skin disorders and cosmetic dermatology."
            },
            {
                "email": "dr.brown@medical.com",
                "password": "Doctor@123",
                "full_name": "Dr. Sarah Brown",
                "phone": "1234567893",
                "specialty": "Neurologist",
                "qualifications": "MBBS, MD, DM Neurology",
                "experience_years": 12,
                "consultation_fee": 120.00,
                "bio": "Specialized in neurological disorders and stroke management."
            },
            {
                "email": "dr.davis@medical.com",
                "password": "Doctor@123",
                "full_name": "Dr. Robert Davis",
                "phone": "1234567894",
                "specialty": "Gastroenterologist",
                "qualifications": "MBBS, MD, DM Gastroenterology",
                "experience_years": 10,
                "consultation_fee": 90.00,
                "bio": "Expert in digestive system disorders and liver diseases."
            }
        ]
        
        for doc_data in sample_doctors:
            # Create user
            user = User(
                email=doc_data["email"],
                password_hash=get_password_hash(doc_data["password"]),
                full_name=doc_data["full_name"],
                phone=doc_data["phone"],
                role=UserRole.DOCTOR,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create doctor profile
            doctor = Doctor(
                user_id=user.user_id,
                specialty=doc_data["specialty"],
                qualifications=doc_data["qualifications"],
                experience_years=doc_data["experience_years"],
                consultation_fee=doc_data["consultation_fee"],
                bio=doc_data["bio"],
                is_verified=True,
                rating=4.5,
                availability_schedule={
                    "monday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
                    "tuesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
                    "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
                    "thursday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
                    "friday": ["09:00", "10:00", "11:00", "14:00", "15:00"]
                }
            )
            db.add(doctor)
        
        db.commit()
        print("Sample doctors created")
    finally:
        db.close()


# Create FastAPI app
app = FastAPI(
    title="Medical Diagnosis Assistant API",
    description="AI-powered medical diagnosis system with role-based access control",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(patient_router)
app.include_router(doctor_router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Medical Diagnosis Assistant API",
        "version": "1.0.0",
        "status": "running"
    }


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Get symptoms list (public endpoint)
@app.get("/api/symptoms")
async def get_symptoms():
    return {
        "symptoms": SYMPTOMS_LIST,
        "total": len(SYMPTOMS_LIST)
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)