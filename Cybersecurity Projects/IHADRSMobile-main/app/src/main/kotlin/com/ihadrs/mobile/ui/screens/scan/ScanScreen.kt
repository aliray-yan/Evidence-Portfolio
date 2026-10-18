package com.ihadrs.mobile.ui.screens.scan

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import com.ihadrs.mobile.data.models.ScanRun
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun ScanScreen(
    padding: PaddingValues,
    viewModel: ScanViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val history by viewModel.scanHistory.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { PageHeader("Deep Scan", "Run local checks against apps, rules, and stored indicators") }
        item {
            InfoPanel {
                SectionTitle("Detection Engine")
                Text("Mode: ${state.engineMode}")
                Text("Rules loaded: ${state.ruleCount}")
                Text("ML status: ${state.modelStatus}", color = IhadrsMuted)
            }
        }
        item {
            InfoPanel {
                SectionTitle("Baseline Learning")
                Text("Status: ${state.baselineStatus}")
                Text(
                    "Use this when the phone is in a normal trusted state. IHADRS observes for 10 minutes, then uses that baseline to reduce routine app noise.",
                    color = IhadrsMuted
                )
                Button(modifier = Modifier.fillMaxWidth(), onClick = viewModel::startBaselineLearning) {
                    Text(state.baselineAction)
                }
            }
        }
        item {
            InfoPanel {
                Text("Latest Result", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(state.lastResult, color = IhadrsMuted)
                if (state.running) {
                    CircularProgressIndicator()
                } else {
                    Button(modifier = Modifier.fillMaxWidth(), onClick = viewModel::startScan) {
                        Text("Run Scan")
                    }
                }
            }
        }
        item { SectionTitle("Scan History") }
        if (history.isEmpty()) {
            item {
                InfoPanel {
                    Text("No scan history yet.", color = IhadrsMuted)
                }
            }
        } else {
            items(history, key = { it.id }) { scanRun ->
                ScanRunCard(scanRun)
            }
        }
    }
}

@Composable
private fun ScanRunCard(scanRun: ScanRun) {
    InfoPanel {
        Text(scanRun.finishedAt.asReadableTime(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text("${scanRun.scannedApps} apps checked")
        Text("${scanRun.findings} finding(s)")
        Text("Status: ${scanRun.status}", color = IhadrsMuted)
    }
}
