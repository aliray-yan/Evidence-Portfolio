from __future__ import annotations

from dataclasses import dataclass
from typing import Any

try:  # pragma: no cover - optional until requirements are installed
    import httpx
except ModuleNotFoundError:  # pragma: no cover
    httpx = None


@dataclass
class ProviderResult:
    name: str
    status: str
    data: dict[str, Any]


class ThreatIntelProvider:
    name = "base"
    daily_limit = 0
    minute_limit = 60

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "API key not configured"})
        return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})

    async def get_json(self, url: str, headers: dict[str, str] | None = None, params: dict | None = None) -> dict:
        if httpx is None:
            raise RuntimeError("httpx is not installed")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()


def disabled_result(name: str) -> ProviderResult:
    return ProviderResult(name, "disabled", {"reason": "API key not configured"})
