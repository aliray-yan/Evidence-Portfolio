package com.ihadrs.mobile.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.repository.AppRepository
import com.ihadrs.mobile.data.repository.ScanRepository
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.domain.usecases.monitoring.StartMonitoringUseCase
import com.ihadrs.mobile.domain.usecases.monitoring.StopMonitoringUseCase
import com.ihadrs.mobile.domain.usecases.posture.SecurityPosture
import com.ihadrs.mobile.domain.usecases.posture.SecurityPostureAdvisor
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DashboardUiState(
    val monitoringEnabled: Boolean = false,
    val activeThreats: Int = 0,
    val installedApps: Int = 0,
    val posture: SecurityPosture = SecurityPosture(
        score = 0,
        label = "Checking",
        highRiskApps = 0,
        unknownSourceApps = 0,
        stages = emptyList(),
        recommendations = listOf("Loading security posture")
    )
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    settingsRepository: SettingsRepository,
    threatRepository: ThreatRepository,
    appRepository: AppRepository,
    scanRepository: ScanRepository,
    private val postureAdvisor: SecurityPostureAdvisor,
    private val startMonitoring: StartMonitoringUseCase,
    private val stopMonitoring: StopMonitoringUseCase
) : ViewModel() {
    val uiState = combine(
        settingsRepository.preferences,
        threatRepository.observeActiveThreatCount(),
        appRepository.observeApps(),
        scanRepository.observeLatestScan()
    ) { prefs, threats, apps, latestScan ->
        DashboardUiState(
            monitoringEnabled = prefs.monitoringEnabled,
            activeThreats = threats,
            installedApps = apps.size,
            posture = postureAdvisor.build(prefs, threats, apps, latestScan)
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DashboardUiState())

    fun toggleMonitoring(enabled: Boolean) {
        viewModelScope.launch {
            if (enabled) startMonitoring() else stopMonitoring()
        }
    }
}
