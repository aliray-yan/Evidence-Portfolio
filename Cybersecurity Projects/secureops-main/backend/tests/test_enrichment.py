import asyncio

from app.services.enrichment_service import enrich_ioc


def test_enrichment_returns_cached_shape(db_session):
    result = asyncio.run(enrich_ioc(db_session, "203.0.113.45"))

    assert result["ioc"] == "203.0.113.45"
    assert "sources" in result
    assert 0 <= result["risk_score"] <= 100
