package com.ihadrs.mobile.detection.intel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ThreatIntelScorerTest {
    private val scorer = ThreatIntelScorer()
    private val catalog = ThreatIntelCatalog(
        blockedDomains = setOf("bad.example"),
        suspiciousSuffixes = setOf("login-verify.example"),
        riskyTlds = setOf("zip"),
        suspiciousKeywords = setOf("verify", "wallet")
    )

    @Test
    fun evaluate_blockedDomainScoresHigh() {
        val result = scorer.evaluate(listOf("https://bad.example/path"), catalog)

        assertTrue(result.score >= 70)
        assertEquals("bad.example", result.matches.first().host)
    }

    @Test
    fun evaluate_riskyTldAndKeywordAddsReasons() {
        val result = scorer.evaluate(listOf("https://secure-wallet.zip/verify"), catalog)

        assertTrue(result.score >= 30)
        assertTrue(result.reasons.any { it.contains("risky") })
        assertTrue(result.reasons.any { it.contains("keyword") })
    }
}
