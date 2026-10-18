package com.ihadrs.mobile.ui.screens.timeline

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.data.repository.TimelineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class TimelineViewModel @Inject constructor(
    timelineRepository: TimelineRepository
) : ViewModel() {
    val events: StateFlow<List<TimelineEvent>> = timelineRepository.observeRecent()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}
