from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": settings.api_version,
        "models_are_trained": settings.models_are_trained,
    }
