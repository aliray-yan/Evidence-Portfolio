package com.ihadrs.mobile.domain.usecases.posture

import com.ihadrs.mobile.data.local.preferences.UserPreferences
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.ScanRun
import javax.inject.Inject

data class SecurityPosture(
    val score: Int,
    val label: String,
    val highRiskApps: Int,
    val unknownSourceApps: Int,
    val stages: List<PostureStage>,
    val recommendations: List<String>
)

data class PostureStage(
    val name: String,
    val status: String,
    val detail: String
)

class SecurityPostureAdvisor @Inject constructor() {
    fun build(
        preferences: UserPreferences,
        activeThreats: Int,
        apps: List<AppInfo>,
        latestScan: ScanRun?
    ): SecurityPosture {
        val highRiskApps = apps.count { it.riskScore >= HIGH_RISK_THRESHOLD }
        val unknownSourceApps = apps.count { it.fromUnknownSource }
        val score = (
            100 -
                (activeThreats * 15).coerceAtMost(45) -
                (highRiskApps * 5).coerceAtMost(25) -
                (unknownSourceApps * 3).coerceAtMost(15) -
                ifPenalty(!preferences.monitoringEnabled, 20) -
                ifPenalty(latestScan == null, 15) -
                ifPenalty(apps.isEmpty(), 10)
            ).coerceIn(0, 100)

        return SecurityPosture(
            score = score,
            label = when {
                score >= 85 -> "Hardened"
                score >= 70 -> "Stable"
                score >= 45 -> "Needs attention"
                else -> "Exposed"
            },
            highRiskApps = highRiskApps,
            unknownSourceApps = unknownSourceApps,
            stages = buildStages(preferences, activeThreats, apps, latestScan),
            recommendations = buildRecommendations(preferences, activeThreats, apps, latestScan, highRiskApps, unknownSourceApps)
        )
    }

    private fun buildStages(
        preferences: UserPreferences,
        activeThreats: Int,
        apps: List<AppInfo>,
        latestScan: ScanRun?
    ): List<PostureStage> = listOf(
        PostureStage(
            name = "Monitor",
            status = if (preferences.monitoringEnabled) "Active" else "Paused",
            detail = if (preferences.monitoringEnabled) "Foreground protection is enabled" else "Start monitoring for live coverage"
        ),
        PostureStage(
            name = "Detect",
            status = if (latestScan == null) "No scan" else "Ready",
            detail = latestScan?.let { "${it.scannedApps} apps checked, ${it.findings} finding(s)" } ?: "Run a deep scan to baseline this phone"
        ),
        PostureStage(
            name = "Advise",
            status = if (activeThreats == 0) "Clear" else "$activeThreats active",
            detail = if (activeThreats == 0) "No active alerts need action" else "Review alerts and follow remediation"
        ),
        PostureStage(
            name = "Respond",
            status = if (apps.isEmpty()) "Waiting" else "Prepared",
            detail = if (apps.isEmpty()) "Refresh inventory first" else "App inventory is ready for review"
        )
    )

    private fun buildRecommendations(
        preferences: UserPreferences,
        activeThreats: Int,
        apps: List<AppInfo>,
        latestScan: ScanRun?,
        highRiskApps: Int,
        unknownSourceApps: Int
    ): List<String> = buildList {
        if (!preferences.monitoringEnabled) add("Start live monitoring so IHADRS can keep watching for new events.")
        if (latestScan == null) add("Run a deep scan to establish a clean security baseline.")
        if (apps.isEmpty()) add("Refresh the app inventory so installed apps can be scored.")
        if (activeThreats > 0) add("Open Threats and resolve the active alerts with the highest severity first.")
        if (unknownSourceApps > 0) add("Review apps installed outside trusted installers and remove anything unfamiliar.")
        if (highRiskApps > 0) add("Review high-risk apps and disable unnecessary sensitive permissions.")
        if (!preferences.smsMonitoringEnabled) add("Enable SMS phishing checks if you want message protection.")
        if (isEmpty()) add("Keep monitoring enabled and run a weekly deep scan after installing new apps.")
    }.take(MAX_RECOMMENDATIONS)

    private fun ifPenalty(condition: Boolean, value: Int): Int = if (condition) value else 0

    private companion object {
        const val HIGH_RISK_THRESHOLD = 70
        const val MAX_RECOMMENDATIONS = 5
    }
}
