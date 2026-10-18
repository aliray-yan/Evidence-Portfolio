package com.ihadrs.mobile.ui.screens.integrity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.IntegrityScanResult
import com.ihadrs.mobile.domain.usecases.integrity.DeviceIntegrityScanner
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class IntegrityUiState(
    val running: Boolean = false,
    val result: IntegrityScanResult? = null,
    val message: String = "No integrity scan run yet"
)

@HiltViewModel
class IntegrityViewModel @Inject constructor(
    private val scanner: DeviceIntegrityScanner
) : ViewModel() {
    private val _state = MutableStateFlow(IntegrityUiState())
    val state = _state.asStateFlow()

    fun runScan() {
        viewModelScope.launch {
            _state.value = _state.value.copy(running = true, message = "Scanning device integrity")
            val result = scanner.scanAndReport()
            _state.value = _state.value.copy(
                running = false,
                result = result,
                message = "Scan complete. ${result.findings.size} finding(s), score ${result.riskScore}/100."
            )
        }
    }
}
