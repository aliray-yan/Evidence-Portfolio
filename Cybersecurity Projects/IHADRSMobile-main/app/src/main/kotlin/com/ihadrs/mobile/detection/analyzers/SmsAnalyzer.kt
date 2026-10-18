package com.ihadrs.mobile.detection.analyzers

import com.ihadrs.mobile.detection.intel.ThreatIntelResult
import com.ihadrs.mobile.detection.intel.UrlThreatIntel
import javax.inject.Inject

data class SmsAnalysis(
    val score: Int,
    val links: List<String>,
    val threatIntel: ThreatIntelResult,
    val reasons: List<String>
)

class SmsAnalyzer @Inject constructor(
    private val urlThreatIntel: UrlThreatIntel
) {
    fun analyze(message: String): SmsAnalysis {
        val text = message.lowercase()
        val keywordHits = phishingKeywords.filter { it in text }
        val keywordScore = keywordHits.size * 12
        val links = extractLinks(message)
        val threatIntel = urlThreatIntel.evaluate(links)
        val linkScore = links.size * 12
        val shortenerScore = if (shorteners.any { it in text }) 15 else 0
        val score = (keywordScore + linkScore + shortenerScore + threatIntel.score).coerceIn(0, 100)
        val reasons = buildList {
            if (keywordHits.isNotEmpty()) add("message contains suspicious term(s): ${keywordHits.joinToString()}")
            if (links.isNotEmpty()) add("message contains ${links.size} link(s)")
            if (shortenerScore > 0) add("message uses a common link shortener")
            addAll(threatIntel.reasons)
        }.distinct()
        return SmsAnalysis(score, links, threatIntel, reasons)
    }

    fun phishingScore(message: String): Int = analyze(message).score

    fun extractLinks(message: String): List<String> =
        urlRegex.findAll(message).map { it.value.trimEnd('.', ',', ')') }.distinct().toList()

    companion object {
        private val urlRegex = Regex("""https?://[^\s]+|www\.[^\s]+""", RegexOption.IGNORE_CASE)
        private val shorteners = listOf("bit.ly", "tinyurl", "t.co/", "goo.gl", "is.gd", "cutt.ly")
        private val phishingKeywords = listOf(
            "otp",
            "password",
            "urgent",
            "verify",
            "blocked",
            "bank",
            "wallet",
            "login",
            "account",
            "payment",
            "prize",
            "delivery"
        )
    }
}
