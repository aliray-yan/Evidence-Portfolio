package com.ihadrs.mobile.data.models

import com.ihadrs.mobile.domain.models.Severity

enum class IntegrityFindingType {
    ROOT_INDICATOR,
    DEVICE_ADMIN,
    ACCESSIBILITY_SERVICE,
    VPN_APP,
    LOCATION_PERMISSION,
    DEBUGGING_ENABLED,
    UNKNOWN_SOURCE_RISK,
    SYSTEM_APP_RISK,
    BACKGROUND_LOCATION,
    SCREEN_CAPTURE_RISK
}

data class IntegrityFinding(
    val type: IntegrityFindingType,
    val title: String,
    val detail: String,
    val packageName: String? = null,
    val appName: String? = null,
    val severity: Severity,
    val score: Int,
    val recommendedActions: List<String>
)

data class IntegrityScanResult(
    val scannedAt: Long,
    val riskScore: Int,
    val rootedOrTampered: Boolean,
    val activeDeviceAdmins: Int,
    val enabledAccessibilityServices: Int,
    val vpnApps: Int,
    val locationCapableApps: Int,
    val findings: List<IntegrityFinding>
)
