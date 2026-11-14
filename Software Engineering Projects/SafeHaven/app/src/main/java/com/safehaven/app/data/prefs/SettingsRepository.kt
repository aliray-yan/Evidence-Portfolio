package com.safehaven.app.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.settingsStore: DataStore<Preferences> by preferencesDataStore(name = "safehaven_settings")

data class AppSettings(
    val userName: String = "",
    /** How long the SOS button must be held. */
    val holdMillis: Int = 1500,
    /** Cancel window after the hold completes. 0 sends immediately. */
    val countdownSeconds: Int = 5,
    val silentMode: Boolean = false,
    /** Minutes between location SMS updates during an incident. 0 disables updates. */
    val updateIntervalMinutes: Int = 5,
    val notifyOnResolve: Boolean = true,
    /** Number opened in the dialer from the active-SOS screen. Pakistan police: 15. */
    val emergencyNumber: String = "15",
    val onboardingDone: Boolean = false,
) {
    val displayName: String get() = userName.ifBlank { "a SafeHaven user" }
}

class SettingsRepository(private val context: Context) {
    private object Keys {
        val NAME = stringPreferencesKey("user_name")
        val HOLD = intPreferencesKey("hold_millis")
        val COUNTDOWN = intPreferencesKey("countdown_seconds")
        val SILENT = booleanPreferencesKey("silent_mode")
        val INTERVAL = intPreferencesKey("update_interval_minutes")
        val NOTIFY_RESOLVE = booleanPreferencesKey("notify_on_resolve")
        val EMERGENCY_NUMBER = stringPreferencesKey("emergency_number")
        val ONBOARDING = booleanPreferencesKey("onboarding_done")
    }

    val settings: Flow<AppSettings> = context.settingsStore.data
        .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
        .map { p ->
            val defaults = AppSettings()
            AppSettings(
                userName = p[Keys.NAME] ?: defaults.userName,
                holdMillis = p[Keys.HOLD] ?: defaults.holdMillis,
                countdownSeconds = p[Keys.COUNTDOWN] ?: defaults.countdownSeconds,
                silentMode = p[Keys.SILENT] ?: defaults.silentMode,
                updateIntervalMinutes = p[Keys.INTERVAL] ?: defaults.updateIntervalMinutes,
                notifyOnResolve = p[Keys.NOTIFY_RESOLVE] ?: defaults.notifyOnResolve,
                emergencyNumber = p[Keys.EMERGENCY_NUMBER] ?: defaults.emergencyNumber,
                onboardingDone = p[Keys.ONBOARDING] ?: defaults.onboardingDone,
            )
        }

    suspend fun current(): AppSettings = settings.first()

    suspend fun setUserName(value: String) = put(Keys.NAME, value.trim())
    suspend fun setHoldMillis(value: Int) = put(Keys.HOLD, value.coerceIn(1000, 3000))
    suspend fun setCountdownSeconds(value: Int) = put(Keys.COUNTDOWN, value.coerceIn(0, 10))
    suspend fun setSilentMode(value: Boolean) = put(Keys.SILENT, value)
    suspend fun setUpdateIntervalMinutes(value: Int) = put(Keys.INTERVAL, value.coerceIn(0, 60))
    suspend fun setNotifyOnResolve(value: Boolean) = put(Keys.NOTIFY_RESOLVE, value)
    suspend fun setEmergencyNumber(value: String) = put(Keys.EMERGENCY_NUMBER, value.filter { it.isDigit() || it == '+' })
    suspend fun setOnboardingDone(value: Boolean) = put(Keys.ONBOARDING, value)

    private suspend fun <T> put(key: Preferences.Key<T>, value: T) {
        context.settingsStore.edit { it[key] = value }
    }
}
