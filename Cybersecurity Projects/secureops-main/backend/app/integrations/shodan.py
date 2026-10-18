from app.integrations.base import ProviderResult, ThreatIntelProvider


class ShodanProvider(ThreatIntelProvider):
    name = "shodan"
    daily_limit = 100
    minute_limit = 10

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "SHODAN_API_KEY not configured"})
        if ioc_type != "ip":
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})
        try:
            payload = await self.get_json(f"https://api.shodan.io/shodan/host/{ioc}", params={"key": self.api_key})
            return ProviderResult(
                self.name,
                "success",
                {
                    "ports": payload.get("ports", []),
                    "organization": payload.get("org"),
                    "asn": payload.get("asn"),
                    "vulnerabilities": list((payload.get("vulns") or {}).keys()),
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover
            return ProviderResult(self.name, "error", {"error": str(exc)})
