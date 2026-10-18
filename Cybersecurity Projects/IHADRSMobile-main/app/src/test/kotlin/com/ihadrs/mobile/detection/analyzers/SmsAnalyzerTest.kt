package com.ihadrs.mobile.detection.analyzers

import com.ihadrs.mobile.detection.intel.ThreatIntelResult
import com.ihadrs.mobile.detection.intel.UrlThreatIntel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsAnalyzerTest {
    private val analyzer = SmsAnalyzer(
        object : UrlThreatIntel {
            override fun evaluate(urls: List<String>): ThreatIntelResult =
                ThreatIntelResult(score = if (urls.any { "bit.ly" in it }) 70 else 0, matches = emptyList())
        }
    )

    @Test
    fun phishingScore_increasesForUrgentLink() {
        val score = analyzer.phishingScore("Urgent: verify your bank account at https://bit.ly/check-now")

        assertTrue(score >= 80)
    }

    @Test
    fun extractLinks_returnsDistinctLinks() {
        val links = analyzer.extractLinks("Open https://example.com and https://example.com.")

        assertEquals(listOf("https://example.com"), links)
    }

    @Test
    fun analyze_returnsReasons() {
        val analysis = analyzer.analyze("Verify your bank account at https://bit.ly/check-now")

        assertTrue(analysis.reasons.any { it.contains("suspicious term") })
        assertEquals(listOf("https://bit.ly/check-now"), analysis.links)
    }
}
