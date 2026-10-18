import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def _require_env(name: str) -> str:
    """No guessable fallback for credentials — fail loudly at startup
    instead of silently connecting with a known password."""
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(f"missing required env var: {name}")
    return val


DB_USER = os.environ.get("POSTGRES_USER", "legacyx")
DB_PASSWORD = _require_env("POSTGRES_PASSWORD")
DB_HOST = os.environ.get("POSTGRES_HOST", "fleet-db")
DB_NAME = os.environ.get("POSTGRES_DB", "fleet_db")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:5432/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
