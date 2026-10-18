package com.ihadrs.mobile.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun ThreatCard(
    threat: ThreatEvent,
    onClick: () -> Unit,
    onDismiss: () -> Unit
) {
    InfoPanel(modifier = Modifier.clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(threat.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(threat.category.name.replace('_', ' '), style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
            }
            SeverityChip(threat.severity)
        }
        Text(threat.description, style = MaterialTheme.typography.bodyMedium)
        if (threat.triggeredRules.isNotEmpty()) {
            Text("Rules: ${threat.triggeredRules.joinToString()}", style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onClick) { Text("View") }
            OutlinedButton(onClick = onDismiss) { Text("Dismiss") }
        }
    }
}
