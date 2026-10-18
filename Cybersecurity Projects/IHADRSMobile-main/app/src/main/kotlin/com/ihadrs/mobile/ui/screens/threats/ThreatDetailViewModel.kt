package com.ihadrs.mobile.ui.screens.threats

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.domain.usecases.threats.DismissThreatUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class ThreatDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    threatRepository: ThreatRepository,
    private val dismissThreat: DismissThreatUseCase
) : ViewModel() {
    private val threatId: String = checkNotNull(savedStateHandle["id"])

    val threat: StateFlow<ThreatEvent?> = threatRepository.observeThreat(threatId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    fun dismiss(onDismissed: () -> Unit) {
        viewModelScope.launch {
            dismissThreat(threatId)
            onDismissed()
        }
    }
}
