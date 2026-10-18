from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import analyze, health

# Logging is deliberately configured to never include request bodies —
# PRD rule 13 ("Do not log raw images or sensitive image content").
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skinvision")

app = FastAPI(title=settings.app_name, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(analyze.router, tags=["analyze"])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # PRD rule 14: never expose backend stack traces to users.
    logger.exception("Unhandled error while processing %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "internal_error",
            "message": "Something went wrong while analyzing your image. Please try again.",
        },
    )
