package com.ihadrs.mobile.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.local.preferences.UserPreferences
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.SocIntegrationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val socIntegrationRepository: SocIntegrationRepository
) : ViewModel() {
    val preferences = settingsRepository.preferences
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserPreferences())
    val socStats = socIntegrationRepository.queueStats
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), com.ihadrs.mobile.data.models.SocQueueStats())
    private val _socMessage = MutableStateFlow("SecureOps is not tested yet")
    val socMessage = _socMessage.asStateFlow()

    fun setMonitoringEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setMonitoringEnabled(enabled) }
    }

    fun setSmsMonitoringEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setSmsMonitoringEnabled(enabled) }
    }

    fun setNetworkMonitoringEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setNetworkMonitoringEnabled(enabled) }
    }

    fun setDeepScanOnChargingOnly(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setDeepScanOnChargingOnly(enabled) }
    }
    fun setNetworkFlowMonitorEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setNetworkFlowMonitorEnabled(enabled) }
    }

    fun setNetworkFlowRetentionDays(days: Int) {
        viewModelScope.launch { settingsRepository.setNetworkFlowRetentionDays(days) }
    }

    fun setNetworkFlowBaselineEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setNetworkFlowBaselineEnabled(enabled) }
    }

    fun setSuspiciousPortDetectionEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setSuspiciousPortDetectionEnabled(enabled) }
    }

    fun setDgaDetectionEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setDgaDetectionEnabled(enabled) }
    }

    fun setIocMatchingEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setIocMatchingEnabled(enabled) }
    }

    fun setAppTheme(theme: String) {
        viewModelScope.launch { settingsRepository.setAppTheme(theme) }
    }

    fun setAuthEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setAuthEnabled(enabled) }
    }

    fun setSecureOpsEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setSecureOpsEnabled(enabled) }
    }

    fun saveSecureOpsConfig(baseUrl: String, ingestKey: String) {
        viewModelScope.launch {
            settingsRepository.setSecureOpsConfig(baseUrl, ingestKey)
            _socMessage.value = "SecureOps settings saved"
        }
    }

    fun testSecureOpsConnection(baseUrl: String, ingestKey: String) {
        viewModelScope.launch {
            _socMessage.value = "Testing SecureOps connection"
            _socMessage.value = socIntegrationRepository.testConnection(baseUrl, ingestKey).message
        }
    }

    fun syncSecureOpsNow() {
        viewModelScope.launch {
            _socMessage.value = socIntegrationRepository.syncQueued().message
        }
    }
}


