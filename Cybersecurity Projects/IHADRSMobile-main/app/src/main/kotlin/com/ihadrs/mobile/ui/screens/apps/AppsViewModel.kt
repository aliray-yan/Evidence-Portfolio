package com.ihadrs.mobile.ui.screens.apps

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.repository.AppRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class AppsViewModel @Inject constructor(
    private val appRepository: AppRepository
) : ViewModel() {
    val apps = appRepository.observeApps()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<AppInfo>())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            appRepository.refreshInstalledApps()
        }
    }
}
