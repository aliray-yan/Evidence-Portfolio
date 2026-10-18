package com.ihadrs.mobile.ui.screens.network

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.NetworkFlow
import com.ihadrs.mobile.data.repository.FlowRepository
import com.ihadrs.mobile.data.repository.NetworkRepository
import com.ihadrs.mobile.domain.usecases.network.AnalyzeNetworkUseCase
import com.ihadrs.mobile.domain.usecases.network.NetworkPosture
import com.ihadrs.mobile.domain.usecases.networkflow.NetworkFlowSimulationUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class NetworkUiState(
    val posture: NetworkPosture,
    val endpointInput: String = "",
    val analyzing: Boolean = false,
    val resultMessage: String = "No endpoint checked yet",
    val simulationMessage: String = "Simulation not run yet"
)

data class FlowDashboardState(
    val activeFlows: Int = 0,
    val suspiciousFlowsToday: Int = 0,
    val topUploadApps: List<Pair<String, Long>> = emptyList(),
    val topDomains: List<Pair<String, Int>> = emptyList(),
    val topIps: List<Pair<String, Int>> = emptyList()
)

@HiltViewModel
class NetworkViewModel @Inject constructor(
    private val analyzeNetworkUseCase: AnalyzeNetworkUseCase,
    private val networkFlowSimulationUseCase: NetworkFlowSimulationUseCase,
    networkRepository: NetworkRepository,
    private val flowRepository: FlowRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(
        NetworkUiState(posture = analyzeNetworkUseCase.inspectPosture())
    )
    val uiState = _uiState.asStateFlow()

    val events = networkRepository.observeRecent()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<NetworkEvent>())

    val flows = flowRepository.observeLatestFlows()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<NetworkFlow>())

    val highRiskFlows = flowRepository.observeHighRiskFlows()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<NetworkFlow>())

    val flowDashboard = combine(flows, highRiskFlows) { latest, highRisk ->
        val since = System.currentTimeMillis() - 24L * 60L * 60L * 1000L
        FlowDashboardState(
            activeFlows = latest.size,
            suspiciousFlowsToday = highRisk.count { it.timestampStart >= since },
            topUploadApps = latest.groupBy { it.appName ?: it.appPackage ?: "Unknown" }
                .mapValues { entry -> entry.value.sumOf { it.bytesSent } }
                .toList()
                .sortedByDescending { it.second }
                .take(3),
            topDomains = latest.mapNotNull { it.destinationDomain }
                .groupingBy { it }
                .eachCount()
                .toList()
                .sortedByDescending { it.second }
                .take(3),
            topIps = latest.groupingBy { it.destinationIp }
                .eachCount()
                .toList()
                .sortedByDescending { it.second }
                .take(3)
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FlowDashboardState())

    fun updateEndpointInput(value: String) {
        _uiState.value = _uiState.value.copy(endpointInput = value)
    }

    fun refreshPosture() {
        _uiState.value = _uiState.value.copy(posture = analyzeNetworkUseCase.inspectPosture())
    }

    fun analyzeEndpoint() {
        val input = _uiState.value.endpointInput
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(analyzing = true, resultMessage = "Checking endpoint")
            val result = analyzeNetworkUseCase.analyzeEndpoint(input)
            _uiState.value = _uiState.value.copy(
                analyzing = false,
                resultMessage = result.message,
                endpointInput = if (result.event == null) input else "",
                posture = analyzeNetworkUseCase.inspectPosture()
            )
        }
    }

    fun runFlowSimulation() {
        viewModelScope.launch {
            val count = networkFlowSimulationUseCase()
            _uiState.value = _uiState.value.copy(simulationMessage = "Generated $count simulated network flow(s). These are fake test entries.")
        }
    }

    fun clearFlowData() {
        viewModelScope.launch {
            flowRepository.clearAllFlows()
            _uiState.value = _uiState.value.copy(simulationMessage = "Flow and DNS cache data cleared.")
        }
    }
}

