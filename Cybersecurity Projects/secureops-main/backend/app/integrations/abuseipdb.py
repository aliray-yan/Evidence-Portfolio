from app.integrations.base import ProviderResult, ThreatIntelProvider


class AbuseIPDBProvider(ThreatIntelProvider):
    name = "abuseipdb"
    daily_limit = 1000
    minute_limit = 60

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "ABUSEIPDB_API_KEY not configured"})
        if ioc_type != "ip":
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})
        try:
            payload = await self.get_json(
                "https://api.abuseipdb.com/api/v2/check",
                headers={"Key": self.api_key or "", "Accept": "application/json"},
                params={"ipAddress": ioc, "maxAgeInDays": 90, "verbose": ""},
            )
            data = payload.get("data", {})
            return ProviderResult(
                self.name,
                "success",
                {
                    "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
                    "total_reports": data.get("totalReports", 0),
                    "country": data.get("countryCode"),
                    "isp": data.get("isp"),
                    "usage_type": data.get("usageType"),
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover
            return ProviderResult(self.name, "error", {"error": str(exc)})
