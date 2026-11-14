package com.safehaven.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.data.db.IncidentEntity
import com.safehaven.app.domain.MessageBuilder
import com.safehaven.app.ui.ScreenTitle
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.StatusPill
import com.safehaven.app.ui.TrackMap
import com.safehaven.app.ui.color
import com.safehaven.app.ui.detail
import com.safehaven.app.ui.explanation
import com.safehaven.app.ui.formatDateTime
import com.safehaven.app.ui.formatTimeOnly
import com.safehaven.app.ui.label
import com.safehaven.app.ui.theme.StatusColors
import com.safehaven.app.ui.vm.HistoryViewModel
import com.safehaven.app.ui.vm.IncidentDetailViewModel

@Composable
fun HistoryScreen(onOpenIncident: (String) -> Unit, vm: HistoryViewModel = viewModel()) {
    val incidents by vm.incidents.collectAsStateWithLifecycle()
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenTitle("Incident history") }
        if (incidents.isEmpty()) {
            item {
                SectionCard {
                    Text("Nothing here yet", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Every SOS is saved on this phone with a record of who was alerted and what the network reported.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
        items(incidents, key = { it.id }) { incident ->
            IncidentRow(incident, onClick = { onOpenIncident(incident.id) })
        }
    }
}

@Composable
private fun IncidentRow(incident: IncidentEntity, onClick: () -> Unit) {
    SectionCard(Modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(formatDateTime(incident.activatedAt), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            StatusPill(incident.status.label(), incident.status.color())
        }
        Text(
            "Ref ${MessageBuilder.shortId(incident.id)}" + if (incident.resolvedAt == null) "  |  still active" else "",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun IncidentDetailScreen(onDeleted: () -> Unit, vm: IncidentDetailViewModel = viewModel()) {
    val incident by vm.incident.collectAsStateWithLifecycle()
    val events by vm.events.collectAsStateWithLifecycle()
    val locations by vm.locations.collectAsStateWithLifecycle()
    val audit by vm.audit.collectAsStateWithLifecycle()
    var confirmDelete by remember { mutableStateOf(false) }

    val current = incident
    if (current == null) {
        Column(Modifier.padding(20.dp)) { Text("This incident is no longer available.") }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column {
                ScreenTitle("SOS ${MessageBuilder.shortId(current.id)}")
                Text(
                    formatDateTime(current.activatedAt),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item {
            SectionCard {
                StatusPill(current.status.label(), current.status.color())
                Text(current.status.explanation(), style = MaterialTheme.typography.bodyMedium)
                current.statusDetail?.let { Text(it, color = StatusColors.danger(), style = MaterialTheme.typography.bodyMedium) }
                current.resolvedAt?.let { Text("Ended ${formatDateTime(it)}", style = MaterialTheme.typography.bodySmall) }
            }
        }
        item {
            SectionCard {
                Text("Where you were", style = MaterialTheme.typography.titleMedium)
                val points = locations.map { it.latitude to it.longitude }
                if (points.isEmpty()) {
                    Text("No GPS fix was recorded for this incident.", style = MaterialTheme.typography.bodyMedium)
                } else {
                    Text(
                        "${points.size} location point(s). Map tiles need an internet connection.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TrackMap(points = points, modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp))
                }
            }
        }
        item { Text("Messages", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
        if (events.isEmpty()) {
            item { Text("No messages were queued.", style = MaterialTheme.typography.bodyMedium) }
        }
        items(events, key = { it.id }) { event ->
            SectionCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(event.recipientName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(
                            "${event.kind.label()}  |  ${event.attempts} attempt(s)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    StatusPill(event.status.label(), event.status.color())
                }
                Text(event.detail(), style = MaterialTheme.typography.bodyMedium)
            }
        }
        item { Text("Activity log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
        items(audit, key = { it.id }) { entry ->
            Text(
                "${formatTimeOnly(entry.timestamp)}  ${entry.type.lowercase().replace('_', ' ')}" +
                    (entry.detail?.let { " ($it)" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (current.resolvedAt != null) {
            item {
                Button(
                    onClick = { confirmDelete = true },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                ) { Text("Delete this record") }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this record?") },
            text = { Text("The incident, its location points and its message log are removed from this phone. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    vm.delete(onDeleted)
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}
