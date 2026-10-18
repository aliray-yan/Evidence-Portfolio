package com.ihadrs.mobile.detection.analyzers

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import javax.inject.Inject

class AppAnalyzer @Inject constructor(
    private val permissionAnalyzer: PermissionAnalyzer
) {
    fun analyze(appInfo: AppInfo, policyStatus: AppPolicyStatus = AppPolicyStatus.DEFAULT): ThreatEvent? {
        if (policyStatus == AppPolicyStatus.TRUSTED) return null
        val permissionScore = permissionAnalyzer.score(appInfo.requestedPermissions)
        val policyScore = when (policyStatus) {
            AppPolicyStatus.BLOCKED -> 100
            AppPolicyStatus.WATCH -> 20
            AppPolicyStatus.DEFAULT,
            AppPolicyStatus.TRUSTED -> 0
        }
        val score = (appInfo.riskScore + permissionScore + policyScore).coerceAtMost(100)
        val hasCriticalPermission = permissionAnalyzer.hasCriticalPermission(appInfo.requestedPermissions)
        val shouldAlert = when {
            policyStatus == AppPolicyStatus.BLOCKED -> true
            appInfo.systemApp -> false
            policyStatus == AppPolicyStatus.WATCH && score >= 55 -> true
            appInfo.fromUnknownSource && hasCriticalPermission -> true
            appInfo.fromUnknownSource && score >= 85 -> true
            !appInfo.fromUnknownSource && score >= 85 && hasCriticalPermission -> true
            else -> false
        }
        if (!shouldAlert) return null
        val installSource = if (appInfo.fromUnknownSource) {
            "appears to be installed outside trusted installers"
        } else {
            "requests unusually sensitive access"
        }
        return ThreatEvent(
            id = "app-risk-${appInfo.packageName}",
            title = if (policyStatus == AppPolicyStatus.BLOCKED) "Blocked app present" else "Risky app behavior",
            description = "${appInfo.appName} $installSource. Risk score: ${score.coerceAtMost(100)}/100.",
            packageName = appInfo.packageName,
            severity = if (score >= 90) Severity.HIGH else Severity.MEDIUM,
            category = AttackCategory.MALICIOUS_APP,
            timestamp = System.currentTimeMillis(),
            triggeredRules = listOf("APP-001"),
            mitreTechniques = listOf("T1476"),
            remediation = if (policyStatus == AppPolicyStatus.BLOCKED) {
                listOf("Uninstall this blocked app", "Open app settings and revoke sensitive permissions")
            } else if (appInfo.fromUnknownSource) {
                listOf("Confirm the install source", "Uninstall if you do not recognize this app")
            } else {
                listOf("Review sensitive permissions", "Keep installed only if you trust this app")
            }
        )
    }
}
