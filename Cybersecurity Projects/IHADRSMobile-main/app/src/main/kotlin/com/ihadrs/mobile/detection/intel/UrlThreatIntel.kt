package com.ihadrs.mobile.detection.intel

interface UrlThreatIntel {
    fun evaluate(urls: List<String>): ThreatIntelResult
}

object EmptyUrlThreatIntel : UrlThreatIntel {
    override fun evaluate(urls: List<String>): ThreatIntelResult = ThreatIntelResult(0, emptyList())
}
