package com.ihadrs.mobile.detection.analyzers

import javax.inject.Inject

class PermissionAnalyzer @Inject constructor() {
    fun score(permissions: List<String>): Int {
        val critical = listOf("READ_SMS", "RECEIVE_SMS", "SEND_SMS", "SYSTEM_ALERT_WINDOW", "REQUEST_INSTALL_PACKAGES")
        val sensitive = listOf("RECORD_AUDIO", "CAMERA", "ACCESS_FINE_LOCATION", "READ_CONTACTS", "READ_CALL_LOG")
        val criticalScore = permissions.countMatches(critical) * 8
        val sensitiveScore = permissions.countMatches(sensitive) * 4
        return (criticalScore + sensitiveScore).coerceAtMost(40)
    }

    fun hasCriticalPermission(permissions: List<String>): Boolean =
        permissions.any { permission ->
            listOf("READ_SMS", "RECEIVE_SMS", "SEND_SMS", "SYSTEM_ALERT_WINDOW", "REQUEST_INSTALL_PACKAGES")
                .any { permission.contains(it) }
        }

    private fun List<String>.countMatches(signals: List<String>): Int =
        count { permission -> signals.any { signal -> permission.contains(signal) } }
}
