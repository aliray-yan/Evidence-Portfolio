package com.ihadrs.mobile.ui.screens.network

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.core.asReadableTime
import com.ihadrs.mobile.data.models.FlowVerdict
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.NetworkFlow
import com.ihadrs.mobile.domain.usecases.network.NetworkPosture
import com.ihadrs.mobile.monitoring.networkflow.LocalVpnMonitorService
import com.ihadrs.mobile.monitoring.networkflow.NetworkFlowMonitorService
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RiskMeter
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun NetworkScreen(
    padding: PaddingValues,
    viewModel: NetworkViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val events by viewModel.events.collectAsState()
    val flows by viewModel.flows.collectAsState()
    val highRiskFlows by viewModel.highRiskFlows.collectAsState()
    val dashboard by viewModel.flowDashboard.collectAsState()
    val context = LocalContext.current
    val vpnPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        ContextCompat.startForegroundService(context, NetworkFlowMonitorService.startIntent(context))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "Network EDR",
                subtitle = "Network metadata only: app, IP/domain, port, protocol, bytes, timestamps, DNS, risk, and reasons"
            )
        }
        item {
            InfoPanel {
                SectionTitle("Privacy Boundary")
                Text(
                    "This feature monitors network metadata only. It does not read messages, passwords, files, photos, or HTTPS content.",
                    color = IhadrsMuted
                )
            }
        }
        item { NetworkPosturePanel(state.posture, onRefresh = viewModel::refreshPosture) }
        item {
            InfoPanel {
                SectionTitle("Network Flow Monitor")
                Text("Persistent monitoring is visible and local. Simulation creates FAKE TEST flows only; use Clear Flow Data after testing.", color = IhadrsMuted)
                Button(modifier = Modifier.fillMaxWidth(), onClick = {
                    val permissionIntent: Intent? = LocalVpnMonitorService.prepareIntent(context)
                    if (permissionIntent != null) {
                        vpnPermissionLauncher.launch(permissionIntent)
                    } else {
                        ContextCompat.startForegroundService(context, NetworkFlowMonitorService.startIntent(context))
                    }
                }) { Text("Start Visible Monitor") }
                Button(modifier = Modifier.fillMaxWidth(), onClick = {
                    context.startService(NetworkFlowMonitorService.stopIntent(context))
                }) { Text("Stop Monitor") }
                Button(modifier = Modifier.fillMaxWidth(), onClick = viewModel::runFlowSimulation) { Text("Run Flow Simulation (Fake Test Data)") }
                Button(modifier = Modifier.fillMaxWidth(), onClick = viewModel::clearFlowData) { Text("Clear Flow/Test Data") }
                Text(state.simulationMessage, color = IhadrsMuted)
            }
        }
        item { FlowDashboardPanel(dashboard) }
        item {
            InfoPanel {
                SectionTitle("Endpoint Intelligence")
                Text("Check a domain or URL against local indicators before opening it.", color = IhadrsMuted)
                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = state.endpointInput,
                    onValueChange = viewModel::updateEndpointInput,
                    label = { Text("Domain or URL") },
                    singleLine = true
                )
                if (state.analyzing) {
                    CircularProgressIndicator()
                } else {
                    Button(
                        modifier = Modifier.fillMaxWidth(),
                        enabled = state.endpointInput.isNotBlank(),
                        onClick = viewModel::analyzeEndpoint
                    ) { Text("Analyze Endpoint") }
                }
                Text(state.resultMessage, color = IhadrsMuted)
            }
        }
        item { SectionTitle("High-Risk Network Flow Alerts") }
        if (highRiskFlows.isEmpty()) {
            item { InfoPanel { Text("No high-risk flow alerts yet.", color = IhadrsMuted) } }
        } else {
            items(highRiskFlows.take(10), key = { it.id }) { flow -> NetworkFlowCard(flow) }
        }
        item { SectionTitle("Live Flows") }
        if (flows.isEmpty()) {
            item { InfoPanel { Text("No flows yet. Run simulation mode to test scoring and UI.", color = IhadrsMuted) } }
        } else {
            items(flows.take(50), key = { it.id }) { flow -> NetworkFlowCard(flow) }
        }
        item { SectionTitle("Recent Network Evidence") }
        if (events.isEmpty()) {
            item { InfoPanel { Text("No endpoint checks yet.", color = IhadrsMuted) } }
        } else {
            items(events.take(20), key = { it.id }) { event -> NetworkEventCard(event) }
        }
    }
}

@Composable
private fun FlowDashboardPanel(dashboard: FlowDashboardState) {
    InfoPanel {
        SectionTitle("Network Monitor Dashboard")
        Text("Active/recent flows: ${dashboard.activeFlows}")
        Text("Suspicious/high-risk flows today: ${dashboard.suspiciousFlowsToday}")
        Text("Top apps by upload", fontWeight = FontWeight.SemiBold)
        dashboard.topUploadApps.ifEmpty { listOf("None" to 0L) }.forEach { Text("- ${it.first}: ${formatBytes(it.second)}") }
        Text("Top contacted domains", fontWeight = FontWeight.SemiBold)
        dashboard.topDomains.ifEmpty { listOf("None" to 0) }.forEach { Text("- ${it.first}: ${it.second}") }
        Text("Top external IPs", fontWeight = FontWeight.SemiBold)
        dashboard.topIps.ifEmpty { listOf("None" to 0) }.forEach { Text("- ${it.first}: ${it.second}") }
    }
}

@Composable
private fun NetworkPosturePanel(posture: NetworkPosture, onRefresh: () -> Unit) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Network Posture", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(posture.transport, color = IhadrsMuted)
            }
            Button(onClick = onRefresh) { Text("Refresh") }
        }
        RiskMeter(posture.riskScore)
        Text("VPN active: ${if (posture.vpnActive) "Yes" else "No"}")
        Text("Validated: ${if (posture.validated) "Yes" else "No"}")
        Text("Metered: ${if (posture.metered) "Yes" else "No"}")
        posture.findings.forEach { Text("- $it", color = IhadrsMuted) }
    }
}

@Composable
private fun NetworkFlowCard(flow: NetworkFlow) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(flow.appName ?: flow.appPackage ?: "Unknown app", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(flow.destinationDomain ?: flow.destinationIp, color = IhadrsMuted)
                if (flow.destinationDomain?.endsWith(".example") == true || flow.destinationIp.startsWith("203.0.113.") || flow.destinationIp.startsWith("198.51.100.") || flow.destinationIp.startsWith("192.0.2.")) {
                    Text("SIMULATION / TEST INDICATOR", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                }
            }
            Text("${flow.riskScore}/100", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        Text("${flow.protocol} ${flow.destinationIp}:${flow.destinationPort ?: 0} - ${flow.timestampStart.asReadableTime()}")
        Text("Sent ${formatBytes(flow.bytesSent)} / Received ${formatBytes(flow.bytesReceived)}")
        Text("Verdict: ${flow.verdict.label()}", color = IhadrsMuted)
        flow.reasons.take(4).forEach { Text("- $it") }
        if (flow.verdict in setOf(FlowVerdict.HIGH_RISK, FlowVerdict.MALICIOUS)) {
            Text("Actions: review permissions, disable background data, uninstall if unknown, check Device Admin, Accessibility, VPN apps, and account security.", color = IhadrsMuted)
        }
    }
}

@Composable
private fun NetworkEventCard(event: NetworkEvent) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(event.host, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("${event.protocol} - ${event.timestamp.asReadableTime()}", color = IhadrsMuted)
            }
            Text("${event.riskScore}/100", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        event.reasons.take(3).forEach { Text("- $it", color = IhadrsMuted) }
    }
}

private fun FlowVerdict.label(): String = name.replace('_', ' ')

private fun formatBytes(bytes: Long): String = when {
    bytes >= 1024L * 1024L -> "${bytes / (1024L * 1024L)} MB"
    bytes >= 1024L -> "${bytes / 1024L} KB"
    else -> "$bytes B"
}

