package com.ihadrs.mobile.detection.rules

import com.google.gson.Gson
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import org.junit.Assert.assertEquals
import org.junit.Test

class RuleParserTest {
    private val parser = RuleParser(Gson())

    @Test
    fun parse_validRule_returnsDetectionRule() {
        val rules = parser.parse(
            """
            [
              {
                "id": "APP-001",
                "name": "Unknown source app",
                "description": "Flags sideloaded apps.",
                "severity": "MEDIUM",
                "category": "MALICIOUS_APP",
                "mitreTechnique": "T1476",
                "enabled": true
              }
            ]
            """.trimIndent()
        )

        assertEquals(1, rules.size)
        assertEquals(Severity.MEDIUM, rules.first().severity)
        assertEquals(AttackCategory.MALICIOUS_APP, rules.first().category)
    }

    @Test
    fun parse_invalidEnum_skipsRule() {
        val rules = parser.parse(
            """
            [
              {
                "id": "BAD-001",
                "name": "Bad",
                "description": "Invalid enum.",
                "severity": "NOPE",
                "category": "MALICIOUS_APP",
                "mitreTechnique": "T0000"
              }
            ]
            """.trimIndent()
        )

        assertEquals(0, rules.size)
    }
}
