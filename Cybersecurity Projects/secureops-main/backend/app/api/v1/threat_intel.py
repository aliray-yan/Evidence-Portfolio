from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst
from app.database import get_db
from app.models.ioc import IOCLookup
from app.models.user import User
from app.schemas.ioc import BulkIOCLookupRequest, IOCLookupRequest, IOCLookupRead, IOCResult
from app.services.enrichment_service import enrich_ioc, quota_status


router = APIRouter()


@router.post("/lookup", response_model=IOCResult)
async def lookup(payload: IOCLookupRequest, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> dict:
    return await enrich_ioc(db, payload.ioc, payload.type.value if payload.type else None, payload.force_refresh)


@router.post("/bulk")
async def bulk(payload: BulkIOCLookupRequest, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> dict:
    results = []
    for ioc in payload.iocs:
        results.append(await enrich_ioc(db, ioc, force_refresh=payload.force_refresh))
    return {"items": results, "total": len(results)}


@router.get("/history", response_model=list[IOCLookupRead])
def history(db: Session = Depends(get_db), _: User = Depends(get_current_user), limit: int = Query(50, ge=1, le=200)) -> list[IOCLookup]:
    return list(db.execute(select(IOCLookup).order_by(IOCLookup.last_lookup.desc()).limit(limit)).scalars().all())


@router.get("/ioc/{value:path}", response_model=IOCLookupRead)
def cached_ioc(value: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> IOCLookup:
    record = db.execute(select(IOCLookup).where(IOCLookup.ioc_value == value).order_by(IOCLookup.last_lookup.desc())).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IOC not found")
    return record


@router.get("/quota")
def quota(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return quota_status(db)


@router.delete("/cache/{lookup_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_cache(lookup_id: str, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> None:
    record = db.get(IOCLookup, lookup_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lookup not found")
    db.delete(record)
    db.commit()
