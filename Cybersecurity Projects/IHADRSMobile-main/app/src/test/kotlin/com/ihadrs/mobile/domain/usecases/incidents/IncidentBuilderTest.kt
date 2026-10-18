package com.ihadrs.mobile.domain.usecases.incidents

import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IncidentBuilderTest {
    private val builder = IncidentBuilder()

    @Test
    fun build_groupsThreatsByPackage() {
        val incidents = builder.build(
            IncidentSource(
                threats = listOf(
                    threat(id = "one", packageName = "example.app", severity = Severity.MEDIUM),
                    threat(id = "two", packageName = "example.app", severity = Severity.HIGH)
                ),
                timeline = emptyList()
            )
        )

        assertEquals(1, incidents.size)
        assertEquals("example.app", incidents.first().packageName)
        assertEquals(Severity.HIGH, incidents.first().severity)
        assertEquals(listOf("one", "two"), incidents.first().threatIds)
    }

    @Test
    fun selfProtectionIncident_returnsIncidentWhenReasonsExist() {
        val incident = builder.selfProtectionIncident(listOf("Monitoring disabled"))

        assertTrue(incident != null)
        assertEquals("self-protection", incident!!.id)
        assertTrue(incident.attackChain.isNotEmpty())
    }

    private fun threat(
        id: String,
        packageName: String?,
        severity: Severity
    ): ThreatEvent =
        ThreatEvent(
            id = id,
            title = "Risky app behavior",
            description = "Signal",
            packageName = packageName,
            severity = severity,
            category = AttackCategory.MALICIOUS_APP,
            timestamp = 1L,
            triggeredRules = listOf("APP-001")
        )
}
