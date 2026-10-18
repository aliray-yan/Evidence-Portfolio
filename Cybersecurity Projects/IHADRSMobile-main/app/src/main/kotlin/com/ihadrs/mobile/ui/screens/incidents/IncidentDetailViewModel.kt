package com.ihadrs.mobile.ui.screens.incidents

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.repository.IncidentRepository
import com.ihadrs.mobile.domain.usecases.incidents.Incident
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class IncidentDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val incidentRepository: IncidentRepository
) : ViewModel() {
    private val incidentId: String = checkNotNull(savedStateHandle["id"])
    private val _incident = MutableStateFlow<Incident?>(null)
    val incident: StateFlow<Incident?> = _incident

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _incident.value = incidentRepository.getIncident(incidentId)
        }
    }

    fun dismissIncident(onDismissed: () -> Unit) {
        viewModelScope.launch {
            incidentRepository.dismissIncident(incidentId)
            onDismissed()
        }
    }
}
