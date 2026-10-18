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
from events import start_consumer_thread

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("crew-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_consumer_thread()
    yield


app = FastAPI(title="Crew Management Service", lifespan=lifespan)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
    start = time.monotonic()
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = correlation_id
    log.info(
        "trace correlationId=%s service=crew-service method=%s path=%s status=%s durationMs=%.1f",
        correlation_id, request.method, request.url.path, response.status_code, (time.monotonic() - start) * 1000,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # 400, not FastAPI's default 422 — same reasoning as
    # services/fleet-service/main.py: the legacy monolith now serves these
    # same routes and answers 400, and a status-code difference would make
    # the gateway's legacy/modern toggle observable.
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
    return {"status": "healthy", "service": "crew-service"}


@app.get("/api/aviation/crew", response_model=list[schemas.CrewMemberOut])
def list_crew(db: Session = Depends(get_db)):
    return db.query(models.CrewMember).all()


@app.get("/api/aviation/crew/{crew_id}", response_model=schemas.CrewMemberOut)
def get_crew(crew_id: uuid.UUID, db: Session = Depends(get_db)):
    crew = db.get(models.CrewMember, crew_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Not found")
    return crew


@app.post("/api/aviation/crew", response_model=schemas.CrewMemberOut, status_code=201)
def create_crew(body: schemas.CrewMemberCreate, db: Session = Depends(get_db)):
    crew = models.CrewMember(**body.model_dump())
    db.add(crew)
    db.commit()
    db.refresh(crew)
    return crew


@app.get("/api/aviation/assignments", response_model=list[schemas.AssignmentOut])
def list_assignments(db: Session = Depends(get_db)):
    return db.query(models.FlightAssignment).all()


@app.post("/api/aviation/assignments", response_model=schemas.AssignmentOut, status_code=201)
def create_assignment(body: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    if db.get(models.CrewMember, body.crew_id) is None:
        raise HTTPException(status_code=400, detail="Unknown crew_id")
    assignment = models.FlightAssignment(flight_id=body.flight_id, crew_id=body.crew_id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment
