package com.ihadrs.mobile.ui.screens.threats

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RemediationActions
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.components.SeverityChip
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun ThreatDetailScreen(
    padding: PaddingValues,
    onDismissed: () -> Unit,
    viewModel: ThreatDetailViewModel = hiltViewModel()
) {
    val threat by viewModel.threat.collectAsState()
    Column(
        Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PageHeader("Threat Detail", "Explainable finding and remediation")
        if (threat == null) {
            InfoPanel {
                Text("Threat not found.", color = IhadrsMuted)
            }
        } else {
            val item = threat!!
            InfoPanel {
                Text(item.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                SeverityChip(item.severity)
                Text("Category: ${item.category.name.replace('_', ' ')}")
                item.packageName?.let { Text("Package: $it", color = IhadrsMuted) }
                Text(item.description)
                OutlinedButton(onClick = { viewModel.dismiss(onDismissed) }) {
                    Text("Dismiss Alert")
                }
            }
            InfoPanel {
                SectionTitle("Detection Evidence")
                Text("Triggered rules: ${item.triggeredRules.joinToString().ifBlank { "None" }}")
                Text("MITRE techniques: ${item.mitreTechniques.joinToString().ifBlank { "None" }}")
            }
            InfoPanel {
                SectionTitle("Recommended Actions")
                if (item.remediation.isEmpty()) {
                    Text("No remediation steps recorded.", color = IhadrsMuted)
                } else {
                    item.remediation.forEach { Text("- $it") }
                }
            }
            InfoPanel {
                SectionTitle("Remediation Center")
                Text("Jump directly to Android controls for this finding.", color = IhadrsMuted)
                RemediationActions(packageName = item.packageName)
            }
        }
    }
}
