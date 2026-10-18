package com.ihadrs.mobile.ui.screens.settings

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted
import com.ihadrs.mobile.utils.PermissionHelper

@Composable
fun SettingsScreen(
    padding: PaddingValues,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val prefs by viewModel.preferences.collectAsState()
    val socStats by viewModel.socStats.collectAsState()
    val socMessage by viewModel.socMessage.collectAsState()
    val context = LocalContext.current
    var permissionRefresh by remember { mutableIntStateOf(0) }
    var secureOpsBaseUrl by remember { mutableStateOf("") }
    var secureOpsIngestKey by remember { mutableStateOf("") }
    val smsPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val enabled = grants.values.all { it }
        if (enabled) viewModel.setSmsMonitoringEnabled(true)
        permissionRefresh++
    }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        permissionRefresh++
    }

    val smsGranted = remember(permissionRefresh) { PermissionHelper.hasSmsProtection(context) }
    val usageGranted = remember(permissionRefresh) { PermissionHelper.hasUsageAccess(context) }
    val notificationsGranted = remember(permissionRefresh) { PermissionHelper.hasNotificationPermission(context) }
    val batteryUnrestricted = remember(permissionRefresh) { PermissionHelper.isIgnoringBatteryOptimizations(context) }

    LaunchedEffect(prefs.secureOpsBaseUrl, prefs.secureOpsIngestKey) {
        secureOpsBaseUrl = prefs.secureOpsBaseUrl
        secureOpsIngestKey = prefs.secureOpsIngestKey
    }

    Column(
        modifier = Modifier
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PageHeader("Settings", "Tune protection modes and Android permissions")
        InfoPanel {
            SectionTitle("Protection")
            SettingSwitch("Core monitoring", prefs.monitoringEnabled, viewModel::setMonitoringEnabled)
            SettingSwitch("SMS phishing checks", prefs.smsMonitoringEnabled, viewModel::setSmsMonitoringEnabled)
            SettingSwitch("Network indicator checks", prefs.networkMonitoringEnabled, viewModel::setNetworkMonitoringEnabled)
            SettingSwitch("Deep scan only when battery is healthy", prefs.deepScanOnChargingOnly, viewModel::setDeepScanOnChargingOnly)
            if (prefs.authPasswordHash.isNotBlank()) {
                SettingSwitch("Require local login", prefs.authEnabled, viewModel::setAuthEnabled)
            }
        }
        InfoPanel {
            SectionTitle("Network Flow Monitor")
            Text("Metadata only. No HTTPS decryption, message reading, file access, or silent export.", color = IhadrsMuted)
            SettingSwitch("Enable Network Flow Monitor", prefs.networkFlowMonitorEnabled, viewModel::setNetworkFlowMonitorEnabled)
            SettingSwitch("Baseline mode", prefs.networkFlowBaselineEnabled, viewModel::setNetworkFlowBaselineEnabled)
            SettingSwitch("Suspicious port detection", prefs.suspiciousPortDetectionEnabled, viewModel::setSuspiciousPortDetectionEnabled)
            SettingSwitch("DGA-like domain detection", prefs.dgaDetectionEnabled, viewModel::setDgaDetectionEnabled)
            SettingSwitch("Local IOC matching", prefs.iocMatchingEnabled, viewModel::setIocMatchingEnabled)
            Text("Retention: ${prefs.networkFlowRetentionDays} day(s)", color = IhadrsMuted)
            SettingsActionButton("Retention 7 Days") { viewModel.setNetworkFlowRetentionDays(7) }
            SettingsActionButton("Retention 30 Days") { viewModel.setNetworkFlowRetentionDays(30) }
            Text("Allowlist/blocklist are loaded from local raw resources in this build.", color = IhadrsMuted)
        }
        InfoPanel {
            SectionTitle("Appearance")
            Text("Theme: ${prefs.appTheme.replaceFirstChar { it.uppercase() }}", color = IhadrsMuted)
            SettingsActionButton("Use System Theme") { viewModel.setAppTheme("system") }
            SettingsActionButton("Light Theme") { viewModel.setAppTheme("light") }
            SettingsActionButton("Dark Theme") { viewModel.setAppTheme("dark") }
        }
        InfoPanel {
            SectionTitle("SecureOps SOC Workbench")
            Text(
                "Send IHADRS detections to SecureOps as EDR alerts. On a physical phone, use your computer or server IP address instead of 127.0.0.1.",
                color = IhadrsMuted
            )
            SettingSwitch("Enable SOC export", prefs.secureOpsEnabled, viewModel::setSecureOpsEnabled)
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = secureOpsBaseUrl,
                onValueChange = { secureOpsBaseUrl = it },
                label = { Text("SecureOps API base URL") },
                placeholder = { Text("http://192.168.1.10:8000/api/v1") },
                singleLine = true
            )
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = secureOpsIngestKey,
                onValueChange = { secureOpsIngestKey = it },
                label = { Text("EDR ingest key") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true
            )
            SettingsActionButton("Save SOC Settings") {
                viewModel.saveSecureOpsConfig(secureOpsBaseUrl, secureOpsIngestKey)
            }
            SettingsActionButton("Test SOC Connection") {
                viewModel.testSecureOpsConnection(secureOpsBaseUrl, secureOpsIngestKey)
            }
            SettingsActionButton("Sync Queued Alerts") {
                viewModel.syncSecureOpsNow()
            }
            Text("Queue: ${socStats.queued} waiting, ${socStats.sent} sent", color = IhadrsMuted)
            Text(socStats.lastError ?: socMessage, color = IhadrsMuted)
        }
        InfoPanel {
            SectionTitle("Permission Health")
            Text("Grant optional Android permissions to improve coverage. IHADRS keeps analysis local.", color = IhadrsMuted)
            PermissionHealthRow(
                title = "SMS protection",
                granted = smsGranted,
                description = if (smsGranted) "Incoming messages can be checked for phishing." else "Required for SMS phishing detection."
            )
            PermissionHealthRow(
                title = "Usage details",
                granted = usageGranted,
                description = if (usageGranted) "App usage context can improve app risk review." else "Open Android Usage Access and allow IHADRS."
            )
            PermissionHealthRow(
                title = "Threat notifications",
                granted = notificationsGranted,
                description = if (notificationsGranted) "Alerts can appear while monitoring runs." else "Required for Android 13+ notification alerts."
            )
            PermissionHealthRow(
                title = "Background reliability",
                granted = batteryUnrestricted,
                description = if (batteryUnrestricted) "Battery optimization is not limiting IHADRS." else "Allow unrestricted battery use for steadier monitoring."
            )
            SettingsActionButton(if (smsGranted) "Review SMS Permission" else "Grant SMS Protection") {
                smsPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS
                    )
                )
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                SettingsActionButton(if (usageGranted) "Review Usage Access" else "Open Usage Access") {
                    context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                }
            }
            if (Build.VERSION.SDK_INT >= 33) {
                SettingsActionButton(if (notificationsGranted) "Review Notification Access" else "Grant Notifications") {
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
            SettingsActionButton(if (batteryUnrestricted) "Review Battery Settings" else "Open Battery Settings") {
                context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
            SettingsActionButton("Open App Settings") {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
                context.startActivity(intent)
            }
        }
    }
}

@Composable
private fun SettingsActionButton(
    label: String,
    onClick: () -> Unit
) {
    Button(
        modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        onClick = onClick
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun PermissionHealthRow(
    title: String,
    granted: Boolean,
    description: String
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(description, color = IhadrsMuted) },
        trailingContent = {
            Text(
                text = if (granted) "Ready" else "Needed",
                color = if (granted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.labelLarge
            )
        }
    )
}

@Composable
private fun SettingSwitch(
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(if (checked) "Enabled" else "Disabled", color = IhadrsMuted) },
        trailingContent = {
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    )
}


