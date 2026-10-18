from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.config import API_KEY_ENV_MAP, ENV_PATH, apply_runtime_env, mask_secret, settings as app_settings, write_env_values
from app.database import get_db
from app.models.priority import PriorityRule
from app.models.user import User, UserRole


router = APIRouter()


class PriorityRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    conditions: dict = {}
    score_modifier: int = Field(ge=-100, le=100)
    is_active: bool = True


class PriorityRuleRead(PriorityRuleCreate):
    id: str
    created_by_id: str | None = None

    model_config = {"from_attributes": True}


class APIKeysUpdate(BaseModel):
    virustotal: str | None = None
    abuseipdb: str | None = None
    alienvault_otx: str | None = None
    greynoise: str | None = None
    shodan: str | None = None
    edr_ingest: str | None = None


def _provider_status() -> dict:
    configured = {
        "virustotal": app_settings.virustotal_api_key,
        "abuseipdb": app_settings.abuseipdb_api_key,
        "alienvault_otx": app_settings.alienvault_otx_api_key,
        "greynoise": app_settings.greynoise_api_key,
        "shodan": app_settings.shodan_api_key,
        "edr_ingest": app_settings.edr_ingest_api_key,
    }
    return {
        provider: {
            "env_var": env_name,
            "configured": bool(configured.get(provider)),
            "masked": mask_secret(configured.get(provider)),
            "requires_key": True,
        }
        for provider, env_name in API_KEY_ENV_MAP.items()
    } | {
        "urlhaus": {"env_var": None, "configured": True, "masked": None, "requires_key": False},
        "malwarebazaar": {"env_var": None, "configured": True, "masked": None, "requires_key": False},
    }


def _parse_api_key_updates(payload: APIKeysUpdate) -> dict[str, str]:
    updates: dict[str, str] = {}
    raw_values = payload.model_dump(exclude_none=True)
    env_to_provider = {env: provider for provider, env in API_KEY_ENV_MAP.items()}

    for provider, raw_value in raw_values.items():
        value = raw_value.strip()
        if not value:
            continue
        parsed_blob = False
        for line in value.splitlines():
            if "=" not in line:
                continue
            key, parsed_value = line.split("=", 1)
            env_name = key.strip()
            if env_name in env_to_provider:
                updates[env_name] = parsed_value.strip().strip('"').strip("'")
                parsed_blob = True
        if not parsed_blob and provider in API_KEY_ENV_MAP:
            updates[API_KEY_ENV_MAP[provider]] = value
    return updates


@router.get("")
def get_settings(_: User = Depends(get_current_user)) -> dict:
    return {
        "app_name": app_settings.app_name,
        "app_env": app_settings.app_env,
        "rate_limit_per_minute": app_settings.rate_limit_per_minute,
        "sample_alerts_on_startup": app_settings.sample_alerts_on_startup,
        "env_path": str(ENV_PATH),
        "features": {
            "ioc_enrichment": True,
            "sample_alert_generator": True,
            "local_llm_optional": bool(app_settings.ollama_base_url),
            "scheduled_reports": True,
        },
    }


@router.put("")
def update_settings(_: User = Depends(require_roles(UserRole.ADMIN))) -> dict:
    return {"ok": True, "message": "Runtime settings are environment-driven in this MVP. Update .env and restart the API."}


@router.get("/api-keys")
def api_keys(_: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST))) -> dict:
    return {"env_path": str(ENV_PATH), "providers": _provider_status()}


@router.put("/api-keys")
def update_api_keys(payload: APIKeysUpdate, _: User = Depends(require_roles(UserRole.ADMIN))) -> dict:
    updates = _parse_api_key_updates(payload)
    if not updates:
        return {"ok": False, "message": "No API keys were provided.", "env_path": str(ENV_PATH), "providers": _provider_status()}
    write_env_values(updates)
    apply_runtime_env(updates)
    return {"ok": True, "message": "API keys saved to .env and applied to the running backend.", "env_path": str(ENV_PATH), "providers": _provider_status()}


@router.get("/priority-rules", response_model=list[PriorityRuleRead])
def list_priority_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[PriorityRule]:
    return list(db.execute(select(PriorityRule).order_by(PriorityRule.created_at.desc())).scalars().all())


@router.post("/priority-rules", response_model=PriorityRuleRead, status_code=status.HTTP_201_CREATED)
def create_priority_rule(payload: PriorityRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST))) -> PriorityRule:
    row = PriorityRule(**payload.model_dump(), created_by_id=current_user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/priority-rules/{rule_id}", response_model=PriorityRuleRead)
def update_priority_rule(rule_id: str, payload: PriorityRuleCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST))) -> PriorityRule:
    row = db.get(PriorityRule, rule_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Priority rule not found")
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/priority-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_priority_rule(rule_id: str, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SENIOR_ANALYST))) -> None:
    row = db.get(PriorityRule, rule_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Priority rule not found")
    db.delete(row)
    db.commit()
