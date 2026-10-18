import os
from dataclasses import dataclass
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = REPO_ROOT / ".env"
SECRET_ENCRYPTION_ENV = "SECRET_ENCRYPTION_KEY"

API_KEY_ENV_MAP = {
    "virustotal": "VIRUSTOTAL_API_KEY",
    "abuseipdb": "ABUSEIPDB_API_KEY",
    "alienvault_otx": "ALIENVAULT_OTX_API_KEY",
    "greynoise": "GREYNOISE_API_KEY",
    "shodan": "SHODAN_API_KEY",
    "edr_ingest": "EDR_INGEST_API_KEY",
}

ENV_TO_SETTINGS_ATTR = {
    "VIRUSTOTAL_API_KEY": "virustotal_api_key",
    "ABUSEIPDB_API_KEY": "abuseipdb_api_key",
    "ALIENVAULT_OTX_API_KEY": "alienvault_otx_api_key",
    "GREYNOISE_API_KEY": "greynoise_api_key",
    "SHODAN_API_KEY": "shodan_api_key",
    "EDR_INGEST_API_KEY": "edr_ingest_api_key",
}

SENSITIVE_ENV_KEYS = set(API_KEY_ENV_MAP.values()) | {
    "GEMINI_API_KEY",
    "HUGGINGFACE_API_KEY",
    "SMTP_PASSWORD",
    "JWT_SECRET_KEY",
    "SECRET_KEY",
}


def _dotenv_paths() -> list[Path]:
    return [ENV_PATH, BACKEND_ROOT / ".env", Path.cwd() / ".env"]


def _read_env_file(env_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not env_path.exists():
        return values
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _decrypt_value(key: str, value: str, raw_values: dict[str, str]) -> str:
    if not value.startswith("enc:"):
        return value
    encryption_key = os.getenv(SECRET_ENCRYPTION_ENV) or raw_values.get(SECRET_ENCRYPTION_ENV)
    if not encryption_key:
        return value
    try:
        return Fernet(encryption_key.encode()).decrypt(value[4:].encode()).decode()
    except (InvalidToken, ValueError):
        return value


def _load_dotenv() -> None:
    for env_path in [ENV_PATH, BACKEND_ROOT / ".env", Path.cwd() / ".env"]:
        raw_values = _read_env_file(env_path)
        if not raw_values:
            continue
        for key, value in raw_values.items():
            os.environ.setdefault(key, _decrypt_value(key, value, raw_values))


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


_load_dotenv()


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "SecureOps")
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = _bool("DEBUG", True)
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production-minimum-32-chars")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_hosts: str = os.getenv("ALLOWED_HOSTS", "*")
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    )

    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./secureops.db")

    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-jwt-secret-minimum-32-chars")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = _int("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    refresh_token_expire_days: int = _int("REFRESH_TOKEN_EXPIRE_DAYS", 7)

    rate_limit_per_minute: int = _int("RATE_LIMIT_PER_MINUTE", 100)

    virustotal_api_key: str | None = os.getenv("VIRUSTOTAL_API_KEY") or None
    abuseipdb_api_key: str | None = os.getenv("ABUSEIPDB_API_KEY") or None
    alienvault_otx_api_key: str | None = os.getenv("ALIENVAULT_OTX_API_KEY") or None
    greynoise_api_key: str | None = os.getenv("GREYNOISE_API_KEY") or None
    shodan_api_key: str | None = os.getenv("SHODAN_API_KEY") or None
    edr_ingest_api_key: str | None = os.getenv("EDR_INGEST_API_KEY") or None

    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
    huggingface_api_key: str | None = os.getenv("HUGGINGFACE_API_KEY") or None

    smtp_host: str | None = os.getenv("SMTP_HOST") or None
    smtp_port: int = _int("SMTP_PORT", 587)
    smtp_user: str | None = os.getenv("SMTP_USER") or None
    smtp_password: str | None = os.getenv("SMTP_PASSWORD") or None

    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_format: str = os.getenv("LOG_FORMAT", "json")

    seed_on_startup: bool = _bool("SEED_ON_STARTUP", True)
    sample_alerts_on_startup: int = max(0, min(1000, _int("SAMPLE_ALERTS_ON_STARTUP", 120)))

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.frontend_url, *self.cors_origins.split(",")]
        return sorted({origin.strip() for origin in origins if origin.strip()})

    @property
    def trusted_hosts(self) -> list[str]:
        hosts = [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]
        return hosts or ["*"]


settings = Settings()


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}...{value[-4:]}"


def write_env_values(updates: dict[str, str]) -> None:
    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing_lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    raw_values = _read_env_file(ENV_PATH)
    encryption_key = os.getenv(SECRET_ENCRYPTION_ENV) or raw_values.get(SECRET_ENCRYPTION_ENV)
    if any(key in SENSITIVE_ENV_KEYS for key in updates) and not encryption_key:
        encryption_key = Fernet.generate_key().decode()
        updates = {SECRET_ENCRYPTION_ENV: encryption_key, **updates}

    seen: set[str] = set()
    next_lines: list[str] = []

    def stored_value(key: str, value: str) -> str:
        if key in SENSITIVE_ENV_KEYS and value and not value.startswith("enc:"):
            key_material = encryption_key or Fernet.generate_key().decode()
            return "enc:" + Fernet(key_material.encode()).encrypt(value.encode()).decode()
        return value

    for line in existing_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            next_lines.append(line)
            continue
        key, _ = stripped.split("=", 1)
        key = key.strip()
        if key in updates:
            next_lines.append(f"{key}={stored_value(key, updates[key])}")
            seen.add(key)
        else:
            next_lines.append(line)

    for key, value in updates.items():
        if key not in seen:
            next_lines.append(f"{key}={stored_value(key, value)}")

    ENV_PATH.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")


def apply_runtime_env(updates: dict[str, str]) -> None:
    for key, value in updates.items():
        os.environ[key] = value
        attr = ENV_TO_SETTINGS_ATTR.get(key)
        if attr:
            setattr(settings, attr, value or None)
