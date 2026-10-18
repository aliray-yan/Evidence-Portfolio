package com.ihadrs.mobile.ui.screens.apps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.core.asReadableTime
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RemediationActions
import com.ihadrs.mobile.ui.components.RiskMeter
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun AppDetailScreen(
    padding: PaddingValues,
    viewModel: AppDetailViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val app = state.appInfo
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PageHeader("App Detail", app?.packageName ?: "Inventory record")
        if (app == null) {
            Text("App not found in the current inventory.")
        } else {
            InfoPanel {
                Text(app.appName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text("Version: ${app.versionName ?: "Unknown"}", color = IhadrsMuted)
                Text(if (app.systemApp) "System app" else "User-installed app")
                Text(if (app.fromUnknownSource) "Install source: outside trusted installers" else "Install source: trusted or not available")
                RiskMeter(app.riskScore)
            }

            InfoPanel {
                SectionTitle("Trust Policy")
                Text("Current policy: ${state.policy.status.name.lowercase().replaceFirstChar { it.uppercase() }}", color = IhadrsMuted)
                PolicyChips(
                    selected = state.policy.status,
                    onSelected = viewModel::setPolicy
                )
            }

            InfoPanel {
                SectionTitle("Risk Explanation")
                state.explanation.forEach { Text("- $it") }
            }

            InfoPanel {
                SectionTitle("Sensitive Permissions")
                if (state.sensitivePermissions.isEmpty()) {
                    Text("None detected by the current rule set.", color = IhadrsMuted)
                } else {
                    state.sensitivePermissions.forEach { Text("- $it") }
                }
            }

            InfoPanel {
                SectionTitle("Behavior History")
                if (state.behaviorHistory.isEmpty()) {
                    Text("No behavior snapshots yet. Run a deep scan to capture history.", color = IhadrsMuted)
                } else {
                    state.behaviorHistory.take(5).forEach { snapshot ->
                        Text(snapshot.capturedAt.asReadableTime(), fontWeight = FontWeight.SemiBold)
                        Text(
                            "Risk ${snapshot.riskScore}/100, permissions ${snapshot.permissionCount}, sensitive ${snapshot.sensitivePermissions.size}",
                            color = IhadrsMuted
                        )
                    }
                }
            }

            InfoPanel {
                SectionTitle("Remediation Center")
                Text("Use direct Android actions to investigate or contain this app.", color = IhadrsMuted)
                RemediationActions(packageName = app.packageName, systemApp = app.systemApp)
            }
        }
    }
}

@Composable
private fun PolicyChips(
    selected: AppPolicyStatus,
    onSelected: (AppPolicyStatus) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PolicyChip(AppPolicyStatus.DEFAULT, selected, onSelected, Modifier.weight(1f))
            PolicyChip(AppPolicyStatus.TRUSTED, selected, onSelected, Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PolicyChip(AppPolicyStatus.WATCH, selected, onSelected, Modifier.weight(1f))
            PolicyChip(AppPolicyStatus.BLOCKED, selected, onSelected, Modifier.weight(1f))
        }
    }
}

@Composable
private fun PolicyChip(
    status: AppPolicyStatus,
    selected: AppPolicyStatus,
    onSelected: (AppPolicyStatus) -> Unit,
    modifier: Modifier
) {
    val label = status.name.lowercase().replaceFirstChar { it.uppercase() }
    if (selected == status) {
        Button(
            modifier = modifier,
            onClick = { onSelected(status) }
        ) {
            Text(label)
        }
    } else {
        OutlinedButton(
        modifier = modifier,
        onClick = { onSelected(status) },
        ) {
            Text(label)
        }
    }
}
