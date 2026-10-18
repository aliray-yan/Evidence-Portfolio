package com.ihadrs.mobile.ui.screens.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
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
import com.ihadrs.mobile.domain.usecases.posture.PostureStage
import com.ihadrs.mobile.domain.usecases.posture.SecurityPosture
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.ProtectionStatusCard
import com.ihadrs.mobile.ui.components.QuickStatsRow
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun DashboardScreen(
    padding: PaddingValues,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "IHADRS Mobile",
                subtitle = "On-device monitoring, explainable alerts, and local security history"
            )
        }
        item { ProtectionStatusCard(active = state.monitoringEnabled) }
        item { SecurityPostureCard(state.posture) }
        item {
            QuickStatsRow(
                activeThreats = state.activeThreats,
                installedApps = state.installedApps,
                highRiskApps = state.posture.highRiskApps
            )
        }
        item {
            InfoPanel {
                Text("Monitoring Controls", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    if (state.monitoringEnabled) {
                        "Live monitoring is enabled. Foreground service protection will continue while Android allows it."
                    } else {
                        "Monitoring is paused. You can still run manual scans from the Scan tab."
                    },
                    color = IhadrsMuted
                )
                if (state.monitoringEnabled) {
                    OutlinedButton(
                        onClick = { viewModel.toggleMonitoring(false) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Stop Monitoring")
                    }
                } else {
                    Button(
                        onClick = { viewModel.toggleMonitoring(true) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Start Monitoring")
                    }
                }
            }
        }
    }
}

@Composable
private fun SecurityPostureCard(posture: SecurityPosture) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("EDR Security Posture", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(posture.label, color = IhadrsMuted)
            }
            Text("${posture.score}/100", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        LinearProgressIndicator(
            progress = posture.score.coerceIn(0, 100) / 100f,
            modifier = Modifier.fillMaxWidth().height(10.dp)
        )
        if (posture.stages.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                posture.stages.forEach { stage -> PostureStageRow(stage) }
            }
        }
        Text("Priority Advice", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        posture.recommendations.forEach { recommendation ->
            Text("- $recommendation", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun PostureStageRow(stage: PostureStage) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stage.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(stage.detail, style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
        }
        Text(stage.status, style = MaterialTheme.typography.labelLarge)
    }
}
