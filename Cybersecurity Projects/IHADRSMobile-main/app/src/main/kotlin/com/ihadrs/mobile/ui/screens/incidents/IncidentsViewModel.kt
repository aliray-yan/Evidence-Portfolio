package com.ihadrs.mobile.ui.screens.incidents

import androidx.lifecycle.ViewModel
import com.ihadrs.mobile.data.repository.IncidentRepository
import com.ihadrs.mobile.domain.usecases.incidents.Incident
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import androidx.lifecycle.viewModelScope

@HiltViewModel
class IncidentsViewModel @Inject constructor(
    incidentRepository: IncidentRepository
) : ViewModel() {
    val incidents: StateFlow<List<Incident>> = incidentRepository.observeIncidents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}
