from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.config import settings
from app.core.logging import configure_logging
from app.core.security_headers import security_headers_middleware
from app.database import SessionLocal, init_db
from app.services.auth_service import ensure_default_users
from app.services.playbook_service import seed_playbooks
from app.tasks.alert_generator import generate_alert_batch
from app.tasks.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_db()
    db = SessionLocal()
    try:
        ensure_default_users(db)
        if settings.seed_on_startup:
            generate_alert_batch(db, settings.sample_alerts_on_startup)
            seed_playbooks(db)
    finally:
        db.close()
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title=settings.app_name,
    description="SecureOps SOC Analyst Workbench API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if settings.trusted_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
app.middleware("http")(security_headers_middleware)

app.include_router(api_router)


@app.get("/")
def root() -> dict:
    return {"name": settings.app_name, "status": "ok", "docs": "/api/docs"}


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}
