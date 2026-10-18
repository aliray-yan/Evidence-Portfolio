from app.integrations.base import ProviderResult, ThreatIntelProvider


class AlienVaultOTXProvider(ThreatIntelProvider):
    name = "alienvault_otx"
    daily_limit = 10000
    minute_limit = 120

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "ALIENVAULT_OTX_API_KEY not configured"})
        path = {
            "ip": f"IPv4/{ioc}/general",
            "domain": f"domain/{ioc}/general",
            "hash_md5": f"file/{ioc}/general",
            "hash_sha1": f"file/{ioc}/general",
            "hash_sha256": f"file/{ioc}/general",
        }.get(ioc_type)
        if not path:
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})
        try:
            payload = await self.get_json(
                f"https://otx.alienvault.com/api/v1/indicators/{path}",
                headers={"X-OTX-API-KEY": self.api_key or ""},
            )
            pulse_info = payload.get("pulse_info", {})
            return ProviderResult(
                self.name,
                "success",
                {
                    "pulse_count": pulse_info.get("count", 0),
                    "pulses": pulse_info.get("pulses", [])[:5],
                    "sections": payload.get("sections", []),
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover
            return ProviderResult(self.name, "error", {"error": str(exc)})
