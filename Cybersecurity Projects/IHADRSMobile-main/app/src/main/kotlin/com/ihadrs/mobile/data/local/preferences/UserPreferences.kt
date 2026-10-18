package com.ihadrs.mobile.data.local.preferences

data class UserPreferences(
    val monitoringEnabled: Boolean = false,
    val smsMonitoringEnabled: Boolean = false,
    val networkMonitoringEnabled: Boolean = true,
    val networkFlowMonitorEnabled: Boolean = false,
    val networkFlowRetentionDays: Int = 14,
    val networkFlowBaselineEnabled: Boolean = false,
    val suspiciousPortDetectionEnabled: Boolean = true,
    val dgaDetectionEnabled: Boolean = true,
    val iocMatchingEnabled: Boolean = true,
    val appTheme: String = "system",
    val deepScanOnChargingOnly: Boolean = true,
    val onboardingCompleted: Boolean = false,
    val authEnabled: Boolean = true,
    val authUsername: String = "",
    val authPasswordHash: String = "",
    val authSalt: String = "",
    val baselineLearningStartedAt: Long = 0L,
    val baselineLearningEndsAt: Long = 0L,
    val baselineLearnedAt: Long = 0L,
    val secureOpsEnabled: Boolean = false,
    val secureOpsBaseUrl: String = "",
    val secureOpsIngestKey: String = ""
)

