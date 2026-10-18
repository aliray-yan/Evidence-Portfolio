package com.ihadrs.mobile.domain.usecases.detection

import com.ihadrs.mobile.data.models.BehaviorChange
import com.ihadrs.mobile.data.repository.AppRepository
import com.ihadrs.mobile.data.models.ScanRun
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.repository.AppBehaviorRepository
import com.ihadrs.mobile.data.repository.AppPolicyRepository
import com.ihadrs.mobile.data.repository.ScanRepository
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.detection.DetectionEngine
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import java.util.UUID
import javax.inject.Inject

class RunDeepScanUseCase @Inject constructor(
    private val appRepository: AppRepository,
    private val appBehaviorRepository: AppBehaviorRepository,
    private val appPolicyRepository: AppPolicyRepository,
    private val threatRepository: ThreatRepository,
    private val scanRepository: ScanRepository,
    private val settingsRepository: SettingsRepository,
    private val timelineRepository: TimelineRepository,
    private val detectionEngine: DetectionEngine
) {
    suspend operator fun invoke(): ScanRun {
        val startedAt = System.currentTimeMillis()
        timelineRepository.record(
            type = TimelineEventType.SCAN_STARTED,
            title = "Deep scan started",
            detail = "Checking installed apps against local EDR rules"
        )
        val apps = appRepository.refreshInstalledApps()
        val prefs = settingsRepository.currentPreferences()
        val now = System.currentTimeMillis()
        val baselineLearned = prefs.baselineLearnedAt > 0L || (prefs.baselineLearningEndsAt > 0L && now >= prefs.baselineLearningEndsAt)
        if (prefs.baselineLearnedAt == 0L && prefs.baselineLearningEndsAt > 0L && now >= prefs.baselineLearningEndsAt) {
            settingsRepository.setBaselineLearned(now)
            timelineRepository.record(
                type = TimelineEventType.BASELINE_LEARNING_COMPLETED,
                title = "Baseline learning completed",
                detail = "Stable installed apps are now treated as baseline unless they become blocked, watched, newly risky, or gain sensitive permissions."
            )
        }
        var findings = 0
        threatRepository.retireRule(APP_RISK_RULE_ID)
        apps.forEach { app ->
            val policy = appPolicyRepository.getPolicy(app.packageName)
            val behaviorChanges = appBehaviorRepository.captureAndDetect(app)
            behaviorChanges
                .filter { !baselineLearned || it.severity == "HIGH" || policy.status != com.ihadrs.mobile.data.models.AppPolicyStatus.DEFAULT }
                .forEach { change ->
                    threatRepository.report(change.toThreatEvent())
                    findings++
                }
            if (baselineLearned && shouldSuppressBaselineApp(app, policy.status)) return@forEach
            val event = detectionEngine.analyzeApp(app, policy.status)
            if (event != null) {
                threatRepository.report(event)
                findings++
            }
        }
        if (findings == 0) {
            threatRepository.seedDemoThreatIfEmpty()
        }
        val scanRun = ScanRun(
            id = UUID.randomUUID().toString(),
            startedAt = startedAt,
            finishedAt = System.currentTimeMillis(),
            scannedApps = apps.size,
            findings = findings,
            status = "COMPLETED"
        )
        scanRepository.record(scanRun)
        timelineRepository.record(
            type = TimelineEventType.SCAN_COMPLETED,
            title = "Deep scan completed",
            detail = "${scanRun.scannedApps} apps checked, ${scanRun.findings} finding(s)",
        )
        return scanRun
    }

    private companion object {
        const val APP_RISK_RULE_ID = "APP-001"
    }
}

private fun BehaviorChange.toThreatEvent(): ThreatEvent =
    ThreatEvent(
        id = "behavior-${packageName}-${type.name.lowercase()}",
        title = "Behavior changed: ${type.name.lowercase().replace('_', ' ')}",
        description = "$appName changed behavior. $detail.",
        packageName = packageName,
        severity = if (severity == "HIGH") Severity.HIGH else Severity.MEDIUM,
        category = when (type) {
            com.ihadrs.mobile.data.models.BehaviorChangeType.SENSITIVE_PERMISSION_ADDED,
            com.ihadrs.mobile.data.models.BehaviorChangeType.RISK_INCREASE -> AttackCategory.PRIVILEGE_ESCALATION
            com.ihadrs.mobile.data.models.BehaviorChangeType.INSTALL_SOURCE_CHANGED,
            com.ihadrs.mobile.data.models.BehaviorChangeType.NEW_APP -> AttackCategory.MALICIOUS_APP
            com.ihadrs.mobile.data.models.BehaviorChangeType.SYSTEM_STATUS_CHANGED,
            com.ihadrs.mobile.data.models.BehaviorChangeType.VERSION_CHANGED -> AttackCategory.UNKNOWN
        },
        timestamp = System.currentTimeMillis(),
        triggeredRules = listOf("BEHAVIOR-001"),
        mitreTechniques = listOf("T1404"),
        remediation = listOf("Review recent app changes", "Open app settings", "Set Watch or Blocked if unexpected")
    )

private fun shouldSuppressBaselineApp(
    app: com.ihadrs.mobile.data.models.AppInfo,
    policyStatus: com.ihadrs.mobile.data.models.AppPolicyStatus
): Boolean {
    if (policyStatus != com.ihadrs.mobile.data.models.AppPolicyStatus.DEFAULT) return false
    if (app.fromUnknownSource) return false
    if (app.riskScore >= 70) return false
    return true
}
