package com.ihadrs.mobile.ui.screens.incidents

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.domain.usecases.incidents.Incident
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.SeverityChip
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun IncidentsScreen(
    padding: PaddingValues,
    onIncidentClick: (String) -> Unit,
    viewModel: IncidentsViewModel = hiltViewModel()
) {
    val incidents by viewModel.incidents.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageHeader(
                title = "Incident Center",
                subtitle = "Grouped findings with attack chain reasoning and response actions"
            )
        }
        if (incidents.isEmpty()) {
            item {
                InfoPanel {
                    Text("No open incidents.", style = MaterialTheme.typography.titleMedium)
                    Text("Run a scan or keep monitoring enabled to build incident context.", color = IhadrsMuted)
                }
            }
        } else {
            items(incidents, key = { it.id }) { incident ->
                IncidentCard(incident = incident, onClick = { onIncidentClick(incident.id) })
            }
        }
    }
}

@Composable
private fun IncidentCard(
    incident: Incident,
    onClick: () -> Unit
) {
    InfoPanel(modifier = Modifier.clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(incident.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(incident.summary, color = IhadrsMuted)
            }
            SeverityChip(incident.severity)
        }
        incident.packageName?.let { Text("Package: $it", color = IhadrsMuted) }
        Text("Attack chain: ${incident.attackChain.count { it.status != "No direct evidence" && it.status != "Not observed" }}/5 phase(s) with signal")
        Text("Status: ${incident.status}", color = IhadrsMuted)
    }
}
