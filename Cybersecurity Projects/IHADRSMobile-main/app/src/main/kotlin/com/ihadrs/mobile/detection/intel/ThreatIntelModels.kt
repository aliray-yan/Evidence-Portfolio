package com.ihadrs.mobile.detection.intel

data class ThreatIntelMatch(
    val url: String,
    val host: String,
    val score: Int,
    val reasons: List<String>
)

data class ThreatIntelResult(
    val score: Int,
    val matches: List<ThreatIntelMatch>
) {
    val reasons: List<String> = matches.flatMap { it.reasons }.distinct()
}

data class ThreatIntelCatalog(
    val blockedDomains: Set<String>,
    val suspiciousSuffixes: Set<String>,
    val riskyTlds: Set<String>,
    val suspiciousKeywords: Set<String>
)
