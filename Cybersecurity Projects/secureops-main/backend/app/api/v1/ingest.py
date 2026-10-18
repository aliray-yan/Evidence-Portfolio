from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.alert import AlertRead
from app.schemas.ingest import EDRAlertBatch, EDRAlertIn, EDRIngestResult
from app.services.alert_service import upsert_alert_by_source_ref
from app.services.edr_normalizer import normalize_edr_alert
from app.services.websocket_manager import websocket_manager


router = APIRouter()


def _verify_ingest_key(
    request: Request,
    x_secureops_ingest_key: str | None = Header(default=None),
) -> None:
    if not settings.edr_ingest_api_key:
        if settings.app_env == "development" and request.client and request.client.host in {"127.0.0.1", "localhost", "::1"}:
            return
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="EDR ingest key is not configured")
    if x_secureops_ingest_key != settings.edr_ingest_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid EDR ingest key")


@router.get("/edr/config")
def edr_ingest_config(request: Request) -> dict:
    base_url = str(request.base_url).rstrip("/")
    return {
        "endpoint": f"{base_url}/api/v1/ingest/edr/alerts",
        "batch_endpoint": f"{base_url}/api/v1/ingest/edr/alerts/batch",
        "header": "X-SecureOps-Ingest-Key",
        "key_required": bool(settings.edr_ingest_api_key),
        "source": "EDR",
    }


@router.post("/edr/alerts", response_model=EDRIngestResult, status_code=status.HTTP_201_CREATED)
async def ingest_edr_alert(
    payload: EDRAlertIn,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_ingest_key),
) -> EDRIngestResult:
    alert, created = upsert_alert_by_source_ref(db, normalize_edr_alert(payload), user_id=None)
    await websocket_manager.broadcast("alert_created" if created else "alert_updated", AlertRead.model_validate(alert).model_dump(mode="json"))
    return EDRIngestResult(created=1 if created else 0, updated=0 if created else 1, alert_ids=[alert.id])


@router.post("/edr/alerts/batch", response_model=EDRIngestResult, status_code=status.HTTP_201_CREATED)
async def ingest_edr_alert_batch(
    payload: EDRAlertBatch,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_ingest_key),
) -> EDRIngestResult:
    alert_ids = []
    created_count = 0
    updated_count = 0
    for item in payload.alerts:
        alert, created = upsert_alert_by_source_ref(db, normalize_edr_alert(item), user_id=None)
        alert_ids.append(alert.id)
        created_count += 1 if created else 0
        updated_count += 0 if created else 1
        await websocket_manager.broadcast("alert_created" if created else "alert_updated", AlertRead.model_validate(alert).model_dump(mode="json"))
    return EDRIngestResult(created=created_count, updated=updated_count, alert_ids=alert_ids)
