from app.integrations.base import ProviderResult, ThreatIntelProvider, httpx


class URLhausProvider(ThreatIntelProvider):
    name = "urlhaus"
    daily_limit = 0
    minute_limit = 120

    @property
    def enabled(self) -> bool:
        return True

    async def lookup(self, ioc: str, ioc_type: str) -> ProviderResult:
        if ioc_type != "url":
            return ProviderResult(self.name, "unsupported", {"ioc_type": ioc_type})
        if httpx is None:
            return ProviderResult(self.name, "disabled", {"reason": "httpx is not installed"})
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post("https://urlhaus-api.abuse.ch/v1/url/", data={"url": ioc})
                response.raise_for_status()
                payload = response.json()
            return ProviderResult(
                self.name,
                "success",
                {
                    "query_status": payload.get("query_status"),
                    "threat": payload.get("threat"),
                    "url_status": payload.get("url_status"),
                    "tags": payload.get("tags", []),
                    "payloads": payload.get("payloads", [])[:5],
                    "raw": payload,
                },
            )
        except Exception as exc:  # pragma: no cover
            return ProviderResult(self.name, "error", {"error": str(exc)})
