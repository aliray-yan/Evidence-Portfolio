package com.ihadrs.mobile.ui.screens.scan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.ScanRun
import com.ihadrs.mobile.data.repository.ScanRepository
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.detection.DetectionEngine
import com.ihadrs.mobile.domain.usecases.detection.RunDeepScanUseCase
import com.ihadrs.mobile.domain.usecases.detection.StartBaselineLearningUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ScanUiState(
    val running: Boolean = false,
    val lastResult: String = "No scan run yet",
    val engineMode: String = "Checking engine",
    val ruleCount: Int = 0,
    val modelStatus: String = "Checking model",
    val baselineStatus: String = "Not learned",
    val baselineAction: String = "Start 10-minute Baseline Learning"
)

@HiltViewModel
class ScanViewModel @Inject constructor(
    private val runDeepScan: RunDeepScanUseCase,
    private val startBaselineLearning: StartBaselineLearningUseCase,
    scanRepository: ScanRepository,
    settingsRepository: SettingsRepository,
    detectionEngine: DetectionEngine
) : ViewModel() {
    private val readiness = detectionEngine.readiness()
    private val running = MutableStateFlow(false)
    private val lastResult = MutableStateFlow("No scan run yet")
    val uiState = combine(settingsRepository.preferences, running, lastResult) { prefs, isRunning, result ->
        val now = System.currentTimeMillis()
        val baselineStatus = when {
            prefs.baselineLearnedAt > 0L -> "Learned baseline active"
            prefs.baselineLearningEndsAt > now -> "Learning until ${((prefs.baselineLearningEndsAt - now) / 60_000L).coerceAtLeast(1)} min remaining"
            prefs.baselineLearningEndsAt > 0L -> "Ready to finalize on next scan"
            else -> "Not learned"
        }
        ScanUiState(
            running = isRunning,
            lastResult = result,
            engineMode = readiness.mode,
            ruleCount = readiness.ruleCount,
            modelStatus = readiness.modelStatus.reason,
            baselineStatus = baselineStatus,
            baselineAction = if (prefs.baselineLearnedAt > 0L) "Restart Baseline Learning" else "Start 10-minute Baseline Learning"
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ScanUiState())
    val scanHistory = scanRepository.observeRecentScans()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<ScanRun>())

    fun startScan() {
        viewModelScope.launch {
            running.value = true
            lastResult.value = "Scanning installed apps"
            val scanRun = runDeepScan()
            running.value = false
            lastResult.value = if (scanRun.findings == 0) {
                    "Scan complete. ${scanRun.scannedApps} apps checked. No risky apps crossed the alert threshold."
                } else {
                    "Scan complete. ${scanRun.scannedApps} apps checked. ${scanRun.findings} finding(s) saved."
                }
        }
    }

    fun startBaselineLearning() {
        viewModelScope.launch {
            startBaselineLearning.invoke()
            lastResult.value = "Baseline learning started. Keep using the phone normally for 10 minutes, then run a deep scan."
        }
    }
}
