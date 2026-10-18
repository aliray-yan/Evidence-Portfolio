package com.ihadrs.mobile.detection.behavior

import com.ihadrs.mobile.data.models.AppBehaviorSnapshot
import com.ihadrs.mobile.data.models.BehaviorChange
import com.ihadrs.mobile.data.models.BehaviorChangeType
import javax.inject.Inject

class AppBehaviorChangeDetector @Inject constructor() {
    fun detect(
        previous: AppBehaviorSnapshot?,
        current: AppBehaviorSnapshot
    ): List<BehaviorChange> {
        if (previous == null) {
            return if (current.riskScore >= NEW_APP_RISK_THRESHOLD || current.fromUnknownSource) {
                listOf(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.NEW_APP,
                        severity = if (current.riskScore >= 80) "HIGH" else "MEDIUM",
                        detail = "New app baseline captured with risk ${current.riskScore}/100"
                    )
                )
            } else {
                emptyList()
            }
        }

        return buildList {
            val riskDelta = current.riskScore - previous.riskScore
            if (riskDelta >= RISK_DELTA_THRESHOLD) {
                add(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.RISK_INCREASE,
                        severity = if (riskDelta >= 30 || current.riskScore >= 80) "HIGH" else "MEDIUM",
                        detail = "Risk increased from ${previous.riskScore}/100 to ${current.riskScore}/100",
                        riskDelta = riskDelta
                    )
                )
            }

            val addedSensitive = current.sensitivePermissions.toSet() - previous.sensitivePermissions.toSet()
            if (addedSensitive.isNotEmpty()) {
                add(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.SENSITIVE_PERMISSION_ADDED,
                        severity = if (addedSensitive.any { it in criticalPermissions }) "HIGH" else "MEDIUM",
                        detail = "New sensitive permission(s): ${addedSensitive.joinToString()}",
                        addedSensitivePermissions = addedSensitive.toList()
                    )
                )
            }

            if (!previous.fromUnknownSource && current.fromUnknownSource) {
                add(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.INSTALL_SOURCE_CHANGED,
                        severity = "HIGH",
                        detail = "Install source changed to outside trusted installers"
                    )
                )
            }

            if (previous.systemApp != current.systemApp) {
                add(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.SYSTEM_STATUS_CHANGED,
                        severity = "MEDIUM",
                        detail = "System app status changed"
                    )
                )
            }

            if (previous.versionName != current.versionName && current.riskScore >= 70) {
                add(
                    BehaviorChange(
                        packageName = current.packageName,
                        appName = current.appName,
                        type = BehaviorChangeType.VERSION_CHANGED,
                        severity = "MEDIUM",
                        detail = "Version changed from ${previous.versionName ?: "unknown"} to ${current.versionName ?: "unknown"} while risk is elevated"
                    )
                )
            }
        }
    }

    private companion object {
        const val NEW_APP_RISK_THRESHOLD = 75
        const val RISK_DELTA_THRESHOLD = 20
        val criticalPermissions = setOf(
            "READ_SMS",
            "RECEIVE_SMS",
            "SEND_SMS",
            "SYSTEM_ALERT_WINDOW",
            "REQUEST_INSTALL_PACKAGES"
        )
    }
}
