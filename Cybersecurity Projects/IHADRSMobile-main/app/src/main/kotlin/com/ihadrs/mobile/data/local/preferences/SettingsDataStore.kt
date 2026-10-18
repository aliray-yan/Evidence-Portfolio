package com.ihadrs.mobile.data.local.preferences

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsStore by preferencesDataStore(name = "ihadrs_settings")

@Singleton
class SettingsDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    val preferences: Flow<UserPreferences> = context.settingsStore.data.map { prefs ->
        UserPreferences(
            monitoringEnabled = prefs[MONITORING_ENABLED] ?: false,
            smsMonitoringEnabled = prefs[SMS_MONITORING_ENABLED] ?: false,
            networkMonitoringEnabled = prefs[NETWORK_MONITORING_ENABLED] ?: true,
            networkFlowMonitorEnabled = prefs[NETWORK_FLOW_MONITOR_ENABLED] ?: false,
            networkFlowRetentionDays = prefs[NETWORK_FLOW_RETENTION_DAYS] ?: 14,
            networkFlowBaselineEnabled = prefs[NETWORK_FLOW_BASELINE_ENABLED] ?: false,
            suspiciousPortDetectionEnabled = prefs[SUSPICIOUS_PORT_DETECTION_ENABLED] ?: true,
            dgaDetectionEnabled = prefs[DGA_DETECTION_ENABLED] ?: true,
            iocMatchingEnabled = prefs[IOC_MATCHING_ENABLED] ?: true,
            appTheme = prefs[APP_THEME] ?: "system",
            deepScanOnChargingOnly = prefs[DEEP_SCAN_CHARGING_ONLY] ?: true,
            onboardingCompleted = prefs[ONBOARDING_COMPLETED] ?: false,
            authEnabled = prefs[AUTH_ENABLED] ?: true,
            authUsername = prefs[AUTH_USERNAME].orEmpty(),
            authPasswordHash = prefs[AUTH_PASSWORD_HASH].orEmpty(),
            authSalt = prefs[AUTH_SALT].orEmpty(),
            baselineLearningStartedAt = prefs[BASELINE_LEARNING_STARTED_AT] ?: 0L,
            baselineLearningEndsAt = prefs[BASELINE_LEARNING_ENDS_AT] ?: 0L,
            baselineLearnedAt = prefs[BASELINE_LEARNED_AT] ?: 0L,
            secureOpsEnabled = prefs[SECUREOPS_ENABLED] ?: false,
            secureOpsBaseUrl = prefs[SECUREOPS_BASE_URL].orEmpty(),
            secureOpsIngestKey = prefs[SECUREOPS_INGEST_KEY].orEmpty()
        )
    }

    suspend fun setMonitoringEnabled(enabled: Boolean) { context.settingsStore.edit { it[MONITORING_ENABLED] = enabled } }
    suspend fun setSmsMonitoringEnabled(enabled: Boolean) { context.settingsStore.edit { it[SMS_MONITORING_ENABLED] = enabled } }
    suspend fun setNetworkMonitoringEnabled(enabled: Boolean) { context.settingsStore.edit { it[NETWORK_MONITORING_ENABLED] = enabled } }
    suspend fun setNetworkFlowMonitorEnabled(enabled: Boolean) { context.settingsStore.edit { it[NETWORK_FLOW_MONITOR_ENABLED] = enabled } }
    suspend fun setNetworkFlowRetentionDays(days: Int) { context.settingsStore.edit { it[NETWORK_FLOW_RETENTION_DAYS] = days.coerceIn(1, 90) } }
    suspend fun setNetworkFlowBaselineEnabled(enabled: Boolean) { context.settingsStore.edit { it[NETWORK_FLOW_BASELINE_ENABLED] = enabled } }
    suspend fun setSuspiciousPortDetectionEnabled(enabled: Boolean) { context.settingsStore.edit { it[SUSPICIOUS_PORT_DETECTION_ENABLED] = enabled } }
    suspend fun setDgaDetectionEnabled(enabled: Boolean) { context.settingsStore.edit { it[DGA_DETECTION_ENABLED] = enabled } }
    suspend fun setIocMatchingEnabled(enabled: Boolean) { context.settingsStore.edit { it[IOC_MATCHING_ENABLED] = enabled } }
    suspend fun setAppTheme(theme: String) { context.settingsStore.edit { it[APP_THEME] = theme } }
    suspend fun setDeepScanOnChargingOnly(enabled: Boolean) { context.settingsStore.edit { it[DEEP_SCAN_CHARGING_ONLY] = enabled } }
    suspend fun setOnboardingCompleted(completed: Boolean) { context.settingsStore.edit { it[ONBOARDING_COMPLETED] = completed } }
    suspend fun setAuthEnabled(enabled: Boolean) { context.settingsStore.edit { it[AUTH_ENABLED] = enabled } }

    suspend fun setAuthCredentials(username: String, passwordHash: String, salt: String) {
        context.settingsStore.edit {
            it[AUTH_USERNAME] = username
            it[AUTH_PASSWORD_HASH] = passwordHash
            it[AUTH_SALT] = salt
            it[AUTH_ENABLED] = true
        }
    }

    suspend fun setBaselineLearning(startedAt: Long, endsAt: Long) {
        context.settingsStore.edit {
            it[BASELINE_LEARNING_STARTED_AT] = startedAt
            it[BASELINE_LEARNING_ENDS_AT] = endsAt
            it[BASELINE_LEARNED_AT] = 0L
        }
    }

    suspend fun setBaselineLearned(learnedAt: Long) { context.settingsStore.edit { it[BASELINE_LEARNED_AT] = learnedAt } }
    suspend fun setSecureOpsEnabled(enabled: Boolean) { context.settingsStore.edit { it[SECUREOPS_ENABLED] = enabled } }

    suspend fun setSecureOpsConfig(baseUrl: String, ingestKey: String) {
        context.settingsStore.edit {
            it[SECUREOPS_BASE_URL] = baseUrl.trim()
            it[SECUREOPS_INGEST_KEY] = ingestKey.trim()
        }
    }

    private companion object {
        val MONITORING_ENABLED = booleanPreferencesKey("monitoring_enabled")
        val SMS_MONITORING_ENABLED = booleanPreferencesKey("sms_monitoring_enabled")
        val NETWORK_MONITORING_ENABLED = booleanPreferencesKey("network_monitoring_enabled")
        val NETWORK_FLOW_MONITOR_ENABLED = booleanPreferencesKey("network_flow_monitor_enabled")
        val NETWORK_FLOW_RETENTION_DAYS = intPreferencesKey("network_flow_retention_days")
        val NETWORK_FLOW_BASELINE_ENABLED = booleanPreferencesKey("network_flow_baseline_enabled")
        val SUSPICIOUS_PORT_DETECTION_ENABLED = booleanPreferencesKey("suspicious_port_detection_enabled")
        val DGA_DETECTION_ENABLED = booleanPreferencesKey("dga_detection_enabled")
        val IOC_MATCHING_ENABLED = booleanPreferencesKey("ioc_matching_enabled")
        val APP_THEME = stringPreferencesKey("app_theme")
        val DEEP_SCAN_CHARGING_ONLY = booleanPreferencesKey("deep_scan_charging_only")
        val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        val AUTH_ENABLED = booleanPreferencesKey("auth_enabled")
        val AUTH_USERNAME = stringPreferencesKey("auth_username")
        val AUTH_PASSWORD_HASH = stringPreferencesKey("auth_password_hash")
        val AUTH_SALT = stringPreferencesKey("auth_salt")
        val BASELINE_LEARNING_STARTED_AT = longPreferencesKey("baseline_learning_started_at")
        val BASELINE_LEARNING_ENDS_AT = longPreferencesKey("baseline_learning_ends_at")
        val BASELINE_LEARNED_AT = longPreferencesKey("baseline_learned_at")
        val SECUREOPS_ENABLED = booleanPreferencesKey("secureops_enabled")
        val SECUREOPS_BASE_URL = stringPreferencesKey("secureops_base_url")
        val SECUREOPS_INGEST_KEY = stringPreferencesKey("secureops_ingest_key")
    }
}

