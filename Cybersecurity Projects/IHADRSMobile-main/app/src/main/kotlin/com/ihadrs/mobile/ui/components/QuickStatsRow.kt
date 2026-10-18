package com.ihadrs.mobile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun QuickStatsRow(activeThreats: Int, installedApps: Int, highRiskApps: Int = 0) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatCard("Threats", activeThreats.toString(), "Active findings", Modifier.weight(1f))
        StatCard("Apps", installedApps.toString(), "Inventory", Modifier.weight(1f))
        StatCard("Risky", highRiskApps.toString(), "Apps to review", Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(label: String, value: String, caption: String, modifier: Modifier = Modifier) {
    InfoPanel(modifier = modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.titleSmall)
            Text(caption, style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
        }
    }
}
