package com.ihadrs.mobile.ui.screens.threats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.domain.usecases.threats.DismissThreatUseCase
import com.ihadrs.mobile.domain.usecases.reports.GenerateSecurityReportUseCase
import com.ihadrs.mobile.domain.usecases.threats.GetThreatsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class ThreatsViewModel @Inject constructor(
    getThreats: GetThreatsUseCase,
    private val dismissThreat: DismissThreatUseCase,
    private val generateSecurityReport: GenerateSecurityReportUseCase
) : ViewModel() {
    val threats = getThreats().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private val _reportText = MutableStateFlow<String?>(null)
    val reportText = _reportText.asStateFlow()

    fun dismiss(id: String) {
        viewModelScope.launch { dismissThreat(id) }
    }

    fun exportReport() {
        viewModelScope.launch {
            _reportText.value = generateSecurityReport()
        }
    }

    fun reportShared() {
        _reportText.value = null
    }
}
