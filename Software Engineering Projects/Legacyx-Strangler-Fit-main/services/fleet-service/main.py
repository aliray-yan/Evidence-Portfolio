import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from prometheus_fastapi_instrumentator import Instrumentator

from database import Base, engine, get_db
import models
import schemas

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fleet-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-provisions schema on startup — same convention as the .NET
    # services' Database.Migrate() call.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Fleet & Maintenance Service", lifespan=lifespan)
# One dependency instead of hand-rolled counters: request count/duration
# histograms plus a ready-to-scrape /metrics, same shape every other
# service in this platform already exposes.
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
    start = time.monotonic()
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = correlation_id
    log.info(
        "trace correlationId=%s service=fleet-service method=%s path=%s status=%s durationMs=%.1f",
        correlation_id, request.method, request.url.path, response.status_code, (time.monotonic() - start) * 1000,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # FastAPI's default for a body that fails validation is 422; every
    # other backend in this platform answers 400 (ASP.NET's [ApiController]
    # and Spring's @Valid both do). Since the legacy monolith now serves
    # these same aviation routes and the gateway can toggle a domain
    # between the two, a 422-vs-400 difference would make the toggle
    # visible to any client that checks status codes. Body shape is
    # unchanged — still {"detail": [...]}.
    #
    # jsonable_encoder, not the raw list: Pydantic v2 puts exception
    # objects in an error's `ctx`, which JSONResponse can't serialize.
    # FastAPI's own default handler does the same thing.
    return JSONResponse(status_code=400, content={"detail": jsonable_encoder(exc.errors())})


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    log.warning("Data integrity violation: %s", exc)
    return JSONResponse(status_code=409, content={"error": "The request conflicts with existing data."})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"error": "An unexpected error occurred."})


@app.get("/health")
def health():
    return {"status": "healthy", "service": "fleet-service"}


@app.get("/api/aviation/aircraft", response_model=list[schemas.AircraftOut])
def list_aircraft(db: Session = Depends(get_db)):
    return db.query(models.Aircraft).all()


@app.get("/api/aviation/aircraft/{tail_number}", response_model=schemas.AircraftOut)
def get_aircraft(tail_number: str, db: Session = Depends(get_db)):
    aircraft = db.get(models.Aircraft, tail_number)
    if aircraft is None:
        raise HTTPException(status_code=404, detail="Not found")
    return aircraft


@app.post("/api/aviation/aircraft", response_model=schemas.AircraftOut, status_code=201)
def create_aircraft(body: schemas.AircraftCreate, db: Session = Depends(get_db)):
    if db.get(models.Aircraft, body.tail_number) is not None:
        raise HTTPException(status_code=409, detail="Aircraft already exists")
    aircraft = models.Aircraft(tail_number=body.tail_number, model=body.model, max_capacity=body.max_capacity)
    db.add(aircraft)
    db.commit()
    db.refresh(aircraft)
    return aircraft


@app.put("/api/aviation/aircraft/{tail_number}/status", response_model=schemas.AircraftOut)
def update_status(tail_number: str, body: schemas.AircraftStatusUpdate, db: Session = Depends(get_db)):
    aircraft = db.get(models.Aircraft, tail_number)
    if aircraft is None:
        raise HTTPException(status_code=404, detail="Not found")
    aircraft.status = body.status
    db.commit()
    db.refresh(aircraft)
    return aircraft


@app.get("/api/aviation/maintenance", response_model=list[schemas.MaintenanceLogOut])
def list_logs(db: Session = Depends(get_db)):
    return db.query(models.MaintenanceLog).order_by(models.MaintenanceLog.maintenance_date.desc()).all()


@app.post("/api/aviation/maintenance", response_model=schemas.MaintenanceLogOut, status_code=201)
def create_log(body: schemas.MaintenanceLogCreate, db: Session = Depends(get_db)):
    if db.get(models.Aircraft, body.tail_number) is None:
        raise HTTPException(status_code=400, detail="Unknown tail_number")
    entry = models.MaintenanceLog(
        tail_number=body.tail_number,
        action_description=body.action_description,
        cleared_by_inspector_id=body.cleared_by_inspector_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
