package com.ihadrs.mobile.ui.screens.apps

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.classification.AppRiskExplainer
import com.ihadrs.mobile.data.models.AppBehaviorSnapshot
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.AppPolicy
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.data.repository.AppBehaviorRepository
import com.ihadrs.mobile.data.repository.AppPolicyRepository
import com.ihadrs.mobile.data.repository.AppRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AppDetailUiState(
    val appInfo: AppInfo? = null,
    val policy: AppPolicy = AppPolicy(packageName = ""),
    val behaviorHistory: List<AppBehaviorSnapshot> = emptyList(),
    val explanation: List<String> = emptyList(),
    val sensitivePermissions: List<String> = emptyList()
)

@HiltViewModel
class AppDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    appRepository: AppRepository,
    appBehaviorRepository: AppBehaviorRepository,
    private val appPolicyRepository: AppPolicyRepository,
    private val riskExplainer: AppRiskExplainer
) : ViewModel() {
    private val packageName: String = checkNotNull(savedStateHandle["packageName"])

    val uiState: StateFlow<AppDetailUiState> = combine(
        appRepository.observeApp(packageName),
        appPolicyRepository.observePolicy(packageName),
        appBehaviorRepository.observeHistory(packageName)
    ) { appInfo, policy, history ->
            if (appInfo == null) {
                AppDetailUiState(policy = policy, behaviorHistory = history)
            } else {
                AppDetailUiState(
                    appInfo = appInfo,
                    policy = policy,
                    behaviorHistory = history,
                    explanation = riskExplainer.explain(appInfo),
                    sensitivePermissions = riskExplainer.sensitivePermissions(appInfo)
                )
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppDetailUiState())

    fun setPolicy(status: AppPolicyStatus) {
        viewModelScope.launch {
            appPolicyRepository.setPolicy(packageName, status)
        }
    }
}
