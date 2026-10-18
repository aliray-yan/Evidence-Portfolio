"""
API Routers Package
"""

from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.patient import router as patient_router
from app.routers.doctor import router as doctor_router

__all__ = ['auth_router', 'admin_router', 'patient_router', 'doctor_router']