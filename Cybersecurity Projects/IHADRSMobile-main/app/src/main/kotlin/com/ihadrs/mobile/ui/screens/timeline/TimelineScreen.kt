package com.ihadrs.mobile.ui.screens.timeline

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
import com.ihadrs.mobile.core.asReadableTime
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun TimelineScreen(
    padding: PaddingValues,
    viewModel: TimelineViewModel = hiltViewModel()
) {
    val events by viewModel.events.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageHeader(
                title = "EDR Timeline",
                subtitle = "Live audit trail for scans, alerts, app changes, SMS checks, and response actions"
            )
        }
        if (events.isEmpty()) {
            item {
                InfoPanel {
                    Text("No timeline events yet.", style = MaterialTheme.typography.titleMedium)
                    Text("Run a scan, start monitoring, dismiss an alert, or change an app policy to build history.", color = IhadrsMuted)
                }
            }
        } else {
            items(events, key = { it.id }) { event ->
                TimelineEventCard(event)
            }
        }
    }
}

@Composable
private fun TimelineEventCard(event: TimelineEvent) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(event.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(eventTypeLabel(event.type), style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
            }
            Text(event.timestamp.asReadableTime(), style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
        }
        Text(event.detail)
        event.packageName?.let { Text("Package: $it", color = IhadrsMuted) }
        event.severity?.let { Text("Severity: $it", color = IhadrsMuted) }
    }
}

private fun eventTypeLabel(type: TimelineEventType): String =
    when (type) {
        TimelineEventType.APP_INSTALLED -> "App installed"
        TimelineEventType.APP_REMOVED -> "App removed"
        TimelineEventType.SMS_CHECKED -> "SMS checked"
        TimelineEventType.NETWORK_CHECKED -> "Network checked"
        TimelineEventType.PERMISSION_CHANGED -> "Permission changed"
        TimelineEventType.BEHAVIOR_CHANGE -> "Behavior change"
        TimelineEventType.SCAN_STARTED -> "Scan started"
        TimelineEventType.SCAN_COMPLETED -> "Scan completed"
        TimelineEventType.ALERT_CREATED -> "Alert created"
        TimelineEventType.ALERT_DISMISSED -> "Alert dismissed"
        TimelineEventType.APP_POLICY_CHANGED -> "Trust policy"
        TimelineEventType.MONITORING_CHANGED -> "Monitoring"
        TimelineEventType.BASELINE_LEARNING_STARTED -> "Baseline learning"
        TimelineEventType.BASELINE_LEARNING_COMPLETED -> "Baseline learned"
    }
