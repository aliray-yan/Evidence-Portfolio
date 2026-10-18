package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.preferences.SettingsDataStore
import com.ihadrs.mobile.data.local.preferences.UserPreferences
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

@Singleton
class SettingsRepository @Inject constructor(
    private val settingsDataStore: SettingsDataStore
) {
    val preferences: Flow<UserPreferences> = settingsDataStore.preferences
    suspend fun currentPreferences(): UserPreferences = preferences.first()
    suspend fun setMonitoringEnabled(enabled: Boolean) = settingsDataStore.setMonitoringEnabled(enabled)
    suspend fun setSmsMonitoringEnabled(enabled: Boolean) = settingsDataStore.setSmsMonitoringEnabled(enabled)
    suspend fun setNetworkMonitoringEnabled(enabled: Boolean) = settingsDataStore.setNetworkMonitoringEnabled(enabled)
    suspend fun setNetworkFlowMonitorEnabled(enabled: Boolean) = settingsDataStore.setNetworkFlowMonitorEnabled(enabled)
    suspend fun setNetworkFlowRetentionDays(days: Int) = settingsDataStore.setNetworkFlowRetentionDays(days)
    suspend fun setNetworkFlowBaselineEnabled(enabled: Boolean) = settingsDataStore.setNetworkFlowBaselineEnabled(enabled)
    suspend fun setSuspiciousPortDetectionEnabled(enabled: Boolean) = settingsDataStore.setSuspiciousPortDetectionEnabled(enabled)
    suspend fun setDgaDetectionEnabled(enabled: Boolean) = settingsDataStore.setDgaDetectionEnabled(enabled)
    suspend fun setIocMatchingEnabled(enabled: Boolean) = settingsDataStore.setIocMatchingEnabled(enabled)
    suspend fun setAppTheme(theme: String) = settingsDataStore.setAppTheme(theme)
    suspend fun setDeepScanOnChargingOnly(enabled: Boolean) = settingsDataStore.setDeepScanOnChargingOnly(enabled)
    suspend fun setOnboardingCompleted(completed: Boolean) = settingsDataStore.setOnboardingCompleted(completed)
    suspend fun setAuthEnabled(enabled: Boolean) = settingsDataStore.setAuthEnabled(enabled)
    suspend fun setAuthCredentials(username: String, passwordHash: String, salt: String) =
        settingsDataStore.setAuthCredentials(username, passwordHash, salt)
    suspend fun setBaselineLearning(startedAt: Long, endsAt: Long) =
        settingsDataStore.setBaselineLearning(startedAt, endsAt)
    suspend fun setBaselineLearned(learnedAt: Long) = settingsDataStore.setBaselineLearned(learnedAt)
    suspend fun setSecureOpsEnabled(enabled: Boolean) = settingsDataStore.setSecureOpsEnabled(enabled)
    suspend fun setSecureOpsConfig(baseUrl: String, ingestKey: String) =
        settingsDataStore.setSecureOpsConfig(baseUrl, ingestKey)
}

