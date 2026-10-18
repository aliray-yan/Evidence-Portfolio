from app.integrations.base import ProviderResult, ThreatIntelProvider


class GreyNoiseProvider(ThreatIntelProvider):
    name = "greynoise"
    daily_limit = 1000
    minute_limit = 60

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "GREYNOISE_API_KEY not configured"})
        if ioc_type != "ip":
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})
        try:
            payload = await self.get_json(
                f"https://api.greynoise.io/v3/community/{ioc}",
                headers={"key": self.api_key or "", "Accept": "application/json"},
            )
            return ProviderResult(
                self.name,
                "success",
                {
                    "classification": payload.get("classification", "unknown"),
                    "name": payload.get("name"),
                    "riot": payload.get("riot", False),
                    "noise": payload.get("noise", False),
                    "link": payload.get("link"),
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover
            return ProviderResult(self.name, "error", {"error": str(exc)})
