package com.ihadrs.mobile.detection.intel

import com.google.gson.Gson
import org.junit.Assert.assertTrue
import org.junit.Test

class ThreatIntelParserTest {
    @Test
    fun parse_cleansDomainsAndTlds() {
        val catalog = ThreatIntelParser(Gson()).parse(
            """
            {
              "blockedDomains": ["WWW.Bad.Example."],
              "suspiciousSuffixes": ["Login-Verify.Example"],
              "riskyTlds": [".zip"],
              "suspiciousKeywords": ["Verify"]
            }
            """.trimIndent()
        )

        assertTrue("bad.example" in catalog.blockedDomains)
        assertTrue("login-verify.example" in catalog.suspiciousSuffixes)
        assertTrue("zip" in catalog.riskyTlds)
        assertTrue("verify" in catalog.suspiciousKeywords)
    }
}
