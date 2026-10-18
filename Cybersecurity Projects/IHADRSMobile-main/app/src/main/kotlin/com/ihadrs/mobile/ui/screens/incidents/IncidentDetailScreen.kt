package com.ihadrs.mobile.ui.screens.incidents

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import com.ihadrs.mobile.domain.usecases.incidents.AttackChainStep
import com.ihadrs.mobile.domain.usecases.incidents.Incident
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RemediationActions
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.components.SeverityChip
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun IncidentDetailScreen(
    padding: PaddingValues,
    onDismissed: () -> Unit,
    viewModel: IncidentDetailViewModel = hiltViewModel()
) {
    val incident by viewModel.incident.collectAsState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PageHeader("Incident Detail", "Attack chain, reasoning, and response")
        if (incident == null) {
            InfoPanel { Text("Incident not found.", color = IhadrsMuted) }
        } else {
            IncidentContent(
                incident = incident!!,
                onDismiss = { viewModel.dismissIncident(onDismissed) }
            )
        }
    }
}

@Composable
private fun IncidentContent(
    incident: Incident,
    onDismiss: () -> Unit
) {
    InfoPanel {
        Text(incident.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        SeverityChip(incident.severity)
        Text(incident.summary)
        incident.packageName?.let { Text("Package: $it", color = IhadrsMuted) }
        Text("Status: ${incident.status}", color = IhadrsMuted)
    }

    InfoPanel {
        SectionTitle("Attack Chain")
        incident.attackChain.forEach { step -> AttackChainStepRow(step) }
    }

    InfoPanel {
        SectionTitle("Severity Reasoning")
        incident.reasoning.forEach { Text("- $it") }
    }

    InfoPanel {
        SectionTitle("One-tap Response")
        incident.responseActions.forEach { Text("- $it") }
        if (incident.threatIds.isNotEmpty()) {
            Button(modifier = Modifier.fillMaxWidth(), onClick = onDismiss) {
                Text("Dismiss Incident After Review")
            }
        } else {
            OutlinedButton(modifier = Modifier.fillMaxWidth(), enabled = false, onClick = {}) {
                Text("Open Settings from Menu")
            }
        }
        RemediationActions(packageName = incident.packageName)
    }

    InfoPanel {
        SectionTitle("Incident Timeline")
        if (incident.timeline.isEmpty()) {
            Text("No related timeline events yet.", color = IhadrsMuted)
        } else {
            incident.timeline.take(8).forEach { event ->
                Text("${event.timestamp.asReadableTime()} - ${event.title}", fontWeight = FontWeight.SemiBold)
                Text(event.detail, color = IhadrsMuted)
            }
        }
    }
}

@Composable
private fun AttackChainStepRow(step: AttackChainStep) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("${step.phase}: ${step.status}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Text(step.evidence, color = IhadrsMuted)
    }
}
