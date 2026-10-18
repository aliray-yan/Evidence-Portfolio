package com.ihadrs.mobile.data.models

enum class BehaviorChangeType {
    NEW_APP,
    RISK_INCREASE,
    SENSITIVE_PERMISSION_ADDED,
    INSTALL_SOURCE_CHANGED,
    SYSTEM_STATUS_CHANGED,
    VERSION_CHANGED
}

data class BehaviorChange(
    val packageName: String,
    val appName: String,
    val type: BehaviorChangeType,
    val severity: String,
    val detail: String,
    val riskDelta: Int = 0,
    val addedSensitivePermissions: List<String> = emptyList()
)
