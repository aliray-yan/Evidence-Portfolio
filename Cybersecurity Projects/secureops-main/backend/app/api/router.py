from fastapi import APIRouter

from app.api.v1 import alerts, auth, cases, dashboard, ingest, playbooks, reports, settings, threat_intel, users, ws


api_router = APIRouter(prefix="/api/v1")


@api_router.get("")
def api_root() -> dict:
    return {
        "name": "SecureOps API",
        "status": "ok",
        "version": "v1",
        "edr_config": "/api/v1/ingest/edr/config",
        "docs": "/api/docs",
    }


@api_router.get("/health")
def api_health() -> dict:
    return {"status": "healthy", "api": "v1"}


api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(threat_intel.router, prefix="/threat-intel", tags=["threat intelligence"])
api_router.include_router(playbooks.router, prefix="/playbooks", tags=["playbooks"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
