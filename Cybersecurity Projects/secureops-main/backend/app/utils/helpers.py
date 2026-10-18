from datetime import UTC, datetime


def now_utc() -> datetime:
    return datetime.now(UTC)


def clamp(value: int, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, value))


def risk_level(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    if score >= 10:
        return "low"
    return "clean"
