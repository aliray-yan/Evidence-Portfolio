from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.abuseipdb import AbuseIPDBProvider
from app.integrations.alienvault_otx import AlienVaultOTXProvider
from app.integrations.greynoise import GreyNoiseProvider
from app.integrations.malwarebazaar import MalwareBazaarProvider
from app.integrations.shodan import ShodanProvider
from app.integrations.urlhaus import URLhausProvider
from app.integrations.virustotal import VirusTotalProvider
from app.models.alert import Alert
from app.models.ioc import APIUsage, IOCLookup, IOCType, RiskLevel
from app.utils.helpers import clamp, now_utc, risk_level
from app.utils.validators import detect_ioc_type


PROVIDER_LIMITS = {
    "virustotal": 500,
    "abuseipdb": 1000,
    "alienvault_otx": 10000,
    "greynoise": 1000,
    "urlhaus": 0,
    "malwarebazaar": 0,
    "shodan": 100,
}


def providers():
    return [
        VirusTotalProvider(settings.virustotal_api_key),
        AbuseIPDBProvider(settings.abuseipdb_api_key),
        AlienVaultOTXProvider(settings.alienvault_otx_api_key),
        GreyNoiseProvider(settings.greynoise_api_key),
        URLhausProvider(None),
        MalwareBazaarProvider(None),
        ShodanProvider(settings.shodan_api_key),
    ]


def _ioc_type(value: str, declared: str | None = None) -> IOCType:
    resolved = declared or detect_ioc_type(value)
    try:
        return IOCType(resolved)
    except ValueError:
        return IOCType.UNKNOWN


def _source_score(name: str, data: dict) -> int:
    if data.get("status") not in {"success", None}:
        return 0
    if name == "virustotal":
        return min(100, data.get("malicious", 0) * 20 + data.get("suspicious", 0) * 10)
    if name == "abuseipdb":
        return int(data.get("abuse_confidence_score", 0))
    if name == "greynoise":
        if data.get("classification") == "malicious":
            return 80
        if data.get("classification") == "benign" or data.get("riot"):
            return 5
    if name == "alienvault_otx":
        return min(80, data.get("pulse_count", 0) * 12)
    if name == "urlhaus":
        return 85 if data.get("query_status") == "ok" else 0
    if name == "malwarebazaar":
        return 90 if data.get("query_status") == "ok" else 0
    if name == "shodan":
        return min(60, len(data.get("vulnerabilities") or []) * 15)
    return 0


def _local_heuristic(ioc: str, ioc_type: str) -> tuple[int, list[str], str]:
    lowered = ioc.lower()
    tags: list[str] = []
    if ioc_type == "ip" and (lowered.startswith("10.") or lowered.startswith("192.168.") or lowered.startswith("172.16.")):
        return 5, ["private-network"], "Private RFC1918 address; reputation APIs usually have no external context."
    if ioc_type in {"hash_md5", "hash_sha1", "hash_sha256"}:
        return 25, ["file-hash"], "Hash lookup pending provider confirmation."
    if any(marker in lowered for marker in ["login", "verify", "secure", "update"]) and ioc_type in {"url", "domain"}:
        return 35, ["phishing-keyword"], "Contains wording commonly seen in phishing infrastructure."
    return 10, tags, "No provider reported a confirmed threat. Treat as unknown until corroborated."


async def enrich_ioc(db: Session, ioc: str, declared_type: str | None = None, force_refresh: bool = False) -> dict:
    ioc = ioc.strip()
    ioc_type = _ioc_type(ioc, declared_type)
    now = now_utc()

    cached = db.execute(
        select(IOCLookup).where(
            IOCLookup.ioc_value == ioc,
            IOCLookup.ioc_type == ioc_type,
            IOCLookup.cached_until > now,
        )
    ).scalar_one_or_none()
    if cached and not force_refresh:
        cached.lookup_count += 1
        cached.last_lookup = now
        db.commit()
        return cached.lookup_results

    source_results: dict[str, dict] = {}
    for provider in providers():
        result = await provider.lookup(ioc, ioc_type.value)
        source_results[result.name] = {"status": result.status, **result.data}
        if result.status == "success":
            usage = db.execute(
                select(APIUsage).where(APIUsage.api_name == result.name, APIUsage.date == now.date())
            ).scalar_one_or_none()
            if not usage:
                usage = APIUsage(api_name=result.name, date=now.date(), requests_limit=PROVIDER_LIMITS.get(result.name, 0))
                db.add(usage)
            usage.requests_made += 1
            usage.last_request_at = now

    source_score = max((_source_score(name, data) for name, data in source_results.items()), default=0)
    heuristic_score, heuristic_tags, heuristic_summary = _local_heuristic(ioc, ioc_type.value)
    score = clamp(max(source_score, heuristic_score))
    level = risk_level(score)
    tags = sorted(
        {
            *heuristic_tags,
            *[
                tag
                for data in source_results.values()
                for tag in (data.get("tags") or [])
                if isinstance(tag, str)
            ],
        }
    )
    related = [
        {"id": alert.id, "title": alert.title, "severity": alert.severity, "status": alert.status}
        for alert in db.execute(select(Alert).where(Alert.description.contains(ioc)).limit(10)).scalars().all()
    ]
    recommendations = [
        "Review related alerts and cases before containment.",
        "Add to watchlist if this indicator appears repeatedly.",
    ]
    if level in {"critical", "high"}:
        recommendations.insert(0, "Escalate and begin containment validation.")
    elif level == "clean":
        recommendations.insert(0, "No immediate action required unless local context is suspicious.")

    cached_until = now + timedelta(hours=24)
    payload = {
        "ioc": ioc,
        "type": ioc_type.value,
        "risk_score": score,
        "risk_level": level,
        "summary": heuristic_summary,
        "sources": source_results,
        "recommendations": recommendations,
        "related_alerts": related,
        "lookup_timestamp": now.isoformat(),
        "cached_until": cached_until.isoformat(),
    }

    record = db.execute(select(IOCLookup).where(IOCLookup.ioc_value == ioc, IOCLookup.ioc_type == ioc_type)).scalar_one_or_none()
    if record:
        record.lookup_results = payload
        record.risk_score = score
        record.risk_level = RiskLevel(level)
        record.tags = tags
        record.last_lookup = now
        record.lookup_count += 1
        record.cached_until = cached_until
    else:
        db.add(
            IOCLookup(
                ioc_value=ioc,
                ioc_type=ioc_type,
                lookup_results=payload,
                risk_score=score,
                risk_level=RiskLevel(level),
                tags=tags,
                cached_until=cached_until,
            )
        )
    db.commit()
    return payload


def quota_status(db: Session) -> list[dict]:
    today = now_utc().date()
    usages = {u.api_name: u for u in db.execute(select(APIUsage).where(APIUsage.date == today)).scalars().all()}
    rows = []
    for name, limit in PROVIDER_LIMITS.items():
        usage = usages.get(name)
        rows.append(
            {
                "api_name": name,
                "requests_made": usage.requests_made if usage else 0,
                "requests_limit": limit,
                "last_request_at": usage.last_request_at if usage else None,
            }
        )
    return rows
