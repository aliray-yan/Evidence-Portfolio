package com.ihadrs.mobile.ui.screens.apps

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.RiskMeter
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun AppsScreen(
    padding: PaddingValues,
    onAppClick: (String) -> Unit,
    viewModel: AppsViewModel = hiltViewModel()
) {
    val apps by viewModel.apps.collectAsState()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { PageHeader("Installed Apps", "Review local app inventory and permission risk") }
        item {
            Button(onClick = viewModel::refresh) {
                Text("Refresh Inventory")
            }
        }
        if (apps.isEmpty()) {
            item { Text("No app inventory yet. Tap refresh or run monitoring.") }
        } else {
            items(apps, key = { it.packageName }) { app ->
                AppRiskCard(app = app, onClick = { onAppClick(app.packageName) })
            }
        }
    }
}

@Composable
private fun AppRiskCard(
    app: AppInfo,
    onClick: () -> Unit
) {
    InfoPanel(modifier = Modifier.clickable(onClick = onClick)) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(app.appName, style = MaterialTheme.typography.titleMedium)
            Text(app.packageName, style = MaterialTheme.typography.bodySmall, color = IhadrsMuted)
            RiskMeter(app.riskScore)
            Text(
                when {
                    app.fromUnknownSource -> "Install source: outside trusted installers"
                    app.systemApp -> "System app"
                    else -> "Install source: trusted or unknown-safe"
                }
            )
            Text("Permissions: ${app.requestedPermissions.size}")
        }
    }
}
