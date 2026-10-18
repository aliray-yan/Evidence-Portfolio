package com.ihadrs.mobile.ui.screens.threats

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.ThreatCard
import com.ihadrs.mobile.ui.theme.IhadrsMuted
import com.ihadrs.mobile.utils.ReportPdfExporter

@Composable
fun ThreatsScreen(
    padding: PaddingValues,
    onThreatClick: (String) -> Unit,
    viewModel: ThreatsViewModel = hiltViewModel()
) {
    val threats by viewModel.threats.collectAsState()
    val reportText by viewModel.reportText.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(reportText) {
        val report = reportText ?: return@LaunchedEffect
        val reportUri = ReportPdfExporter.export(context, report)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_SUBJECT, "IHADRS Mobile Security Report")
            putExtra(Intent.EXTRA_STREAM, reportUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Security Report PDF"))
        viewModel.reportShared()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { PageHeader("Threats", "Review findings, dismiss noise, and export local reports") }
        item {
            Button(onClick = viewModel::exportReport) {
                Text("Share Security Report PDF")
            }
        }
        if (threats.isEmpty()) {
            item {
                InfoPanel {
                    Text("No active threats detected.", style = MaterialTheme.typography.titleMedium)
                    Text("Run a deep scan or enable monitoring to collect local findings.", color = IhadrsMuted)
                }
            }
        } else {
            items(threats, key = { it.id }) { threat ->
                ThreatCard(threat = threat, onClick = { onThreatClick(threat.id) }, onDismiss = { viewModel.dismiss(threat.id) })
            }
        }
    }
}
