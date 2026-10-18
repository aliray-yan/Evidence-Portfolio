import base64

from app.integrations.base import ProviderResult, ThreatIntelProvider


class VirusTotalProvider(ThreatIntelProvider):
    name = "virustotal"
    daily_limit = 500
    minute_limit = 4

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if not self.enabled:
            return ProviderResult(self.name, "disabled", {"reason": "VIRUSTOTAL_API_KEY not configured"})
        endpoint = {
            "ip": f"https://www.virustotal.com/api/v3/ip_addresses/{ioc}",
            "domain": f"https://www.virustotal.com/api/v3/domains/{ioc}",
            "hash_md5": f"https://www.virustotal.com/api/v3/files/{ioc}",
            "hash_sha1": f"https://www.virustotal.com/api/v3/files/{ioc}",
            "hash_sha256": f"https://www.virustotal.com/api/v3/files/{ioc}",
        }.get(ioc_type)
        if ioc_type == "url":
            url_id = base64.urlsafe_b64encode(ioc.encode()).decode().strip("=")
            endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        if not endpoint:
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})

        try:
            payload = await self.get_json(endpoint, headers={"x-apikey": self.api_key or ""})
            stats = payload.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            return ProviderResult(
                self.name,
                "success",
                {
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                    "categories": payload.get("data", {}).get("attributes", {}).get("categories", {}),
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover - depends on external API
            return ProviderResult(self.name, "error", {"error": str(exc)})
