package com.ihadrs.mobile.domain.usecases.posture

import com.ihadrs.mobile.data.local.preferences.UserPreferences
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.ScanRun
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SecurityPostureAdvisorTest {
    private val advisor = SecurityPostureAdvisor()

    @Test
    fun build_rewardsCleanMonitoredDevice() {
        val posture = advisor.build(
            preferences = UserPreferences(monitoringEnabled = true, smsMonitoringEnabled = true),
            activeThreats = 0,
            apps = listOf(cleanApp()),
            latestScan = scan(findings = 0)
        )

        assertTrue(posture.score >= 85)
        assertEquals("Hardened", posture.label)
        assertTrue(posture.recommendations.first().contains("weekly deep scan"))
    }

    @Test
    fun build_prioritizesActionableProblems() {
        val posture = advisor.build(
            preferences = UserPreferences(monitoringEnabled = false, smsMonitoringEnabled = false),
            activeThreats = 2,
            apps = listOf(
                cleanApp(),
                cleanApp(packageName = "example.sideloaded", riskScore = 80, fromUnknownSource = true)
            ),
            latestScan = null
        )

        assertTrue(posture.score < 70)
        assertTrue(posture.recommendations.any { it.contains("Start live monitoring") })
        assertTrue(posture.recommendations.any { it.contains("deep scan") })
        assertTrue(posture.recommendations.any { it.contains("active alerts") })
    }

    private fun cleanApp(
        packageName: String = "example.clean",
        riskScore: Int = 0,
        fromUnknownSource: Boolean = false
    ): AppInfo =
        AppInfo(
            packageName = packageName,
            appName = "Clean App",
            versionName = "1",
            installTime = 0L,
            updateTime = 0L,
            riskScore = riskScore,
            fromUnknownSource = fromUnknownSource
        )

    private fun scan(findings: Int): ScanRun =
        ScanRun(
            id = "scan",
            startedAt = 0L,
            finishedAt = 1L,
            scannedApps = 1,
            findings = findings,
            status = "COMPLETED"
        )
}
