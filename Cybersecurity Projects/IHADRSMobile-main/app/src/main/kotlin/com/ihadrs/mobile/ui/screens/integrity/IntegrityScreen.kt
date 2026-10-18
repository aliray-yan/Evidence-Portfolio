package com.ihadrs.mobile.ui.screens.integrity

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import com.ihadrs.mobile.data.models.IntegrityFinding
import com.ihadrs.mobile.data.models.IntegrityScanResult
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RiskMeter
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun IntegrityScreen(
    padding: PaddingValues,
    viewModel: IntegrityViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "Integrity",
                subtitle = "Root, spyware, location, Device Admin, Accessibility, VPN, and system-risk posture"
            )
        }
        item {
            InfoPanel {
                SectionTitle("Protection Boundary")
                Text(
                    "IHADRS can surface Android compromise indicators and risky permissions, but kernel-level or firmware-level implants may require factory reset, firmware update, or professional forensics.",
                    color = IhadrsMuted
                )
                if (state.running) {
                    CircularProgressIndicator()
                } else {
                    Button(modifier = Modifier.fillMaxWidth(), onClick = viewModel::runScan) {
                        Text("Run Integrity Scan")
                    }
                }
                Text(state.message, color = IhadrsMuted)
            }
        }
        state.result?.let { result ->
            item { IntegritySummary(result) }
            item { SectionTitle("Findings") }
            if (result.findings.isEmpty()) {
                item { InfoPanel { Text("No major integrity findings detected.", color = IhadrsMuted) } }
            } else {
                items(result.findings, key = { "${it.type}-${it.packageName}-${it.title}" }) { finding ->
                    IntegrityFindingCard(finding)
                }
            }
        }
    }
}

@Composable
private fun IntegritySummary(result: IntegrityScanResult) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text("Device Integrity Score", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("Scanned ${result.scannedAt.asReadableTime()}", color = IhadrsMuted)
            }
            Text("${result.riskScore}/100", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        }
        RiskMeter(result.riskScore)
        Text("Root/tamper indicators: ${if (result.rootedOrTampered) "Detected" else "Not detected"}")
        Text("Device Admin apps: ${result.activeDeviceAdmins}")
        Text("Accessibility services: ${result.enabledAccessibilityServices}")
        Text("VPN-capable apps: ${result.vpnApps}")
        Text("Location-capable findings: ${result.locationCapableApps}")
    }
}

@Composable
private fun IntegrityFindingCard(finding: IntegrityFinding) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text(finding.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(finding.type.name.replace('_', ' '), color = IhadrsMuted)
            }
            Text("${finding.score}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        Text(finding.detail)
        finding.packageName?.let { Text("Package: $it", color = IhadrsMuted) }
        Text("Severity: ${finding.severity.name}", color = IhadrsMuted)
        finding.recommendedActions.take(4).forEach { action ->
            Text("- $action")
        }
    }
}
