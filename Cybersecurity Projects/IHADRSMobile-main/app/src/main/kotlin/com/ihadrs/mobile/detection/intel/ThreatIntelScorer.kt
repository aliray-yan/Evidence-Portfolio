package com.ihadrs.mobile.detection.intel

import javax.inject.Inject

class ThreatIntelScorer @Inject constructor() {
    fun evaluate(urls: List<String>, catalog: ThreatIntelCatalog): ThreatIntelResult {
        val matches = urls.mapNotNull { url ->
            val normalized = UrlNormalizer.normalize(url) ?: return@mapNotNull null
            val reasons = mutableListOf<String>()
            var score = 0

            if (normalized.host in catalog.blockedDomains) {
                score += 70
                reasons += "domain is on the local blocklist"
            }
            if (catalog.suspiciousSuffixes.any { suffix -> normalized.host == suffix || normalized.host.endsWith(".$suffix") }) {
                score += 55
                reasons += "domain matches a suspicious suffix"
            }
            val tld = normalized.host.substringAfterLast('.', "")
            if (tld in catalog.riskyTlds) {
                score += 20
                reasons += "domain uses a risky top-level domain"
            }
            val keywordHits = catalog.suspiciousKeywords.filter { keyword ->
                keyword in normalized.host || keyword in normalized.path.lowercase()
            }
            if (keywordHits.isNotEmpty()) {
                score += (keywordHits.size * 10).coerceAtMost(30)
                reasons += "URL contains suspicious keyword(s): ${keywordHits.joinToString()}"
            }
            if (normalized.host.isIpLiteral()) {
                score += 25
                reasons += "URL uses a direct IP address"
            }

            if (score == 0) {
                null
            } else {
                ThreatIntelMatch(
                    url = normalized.normalized,
                    host = normalized.host,
                    score = score.coerceIn(0, 100),
                    reasons = reasons.distinct()
                )
            }
        }
        return ThreatIntelResult(
            score = matches.maxOfOrNull { it.score } ?: 0,
            matches = matches
        )
    }

    private fun String.isIpLiteral(): Boolean =
        matches(Regex("""\d{1,3}(\.\d{1,3}){3}"""))
}
