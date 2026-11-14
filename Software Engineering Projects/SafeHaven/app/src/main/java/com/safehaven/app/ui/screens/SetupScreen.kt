package com.safehaven.app.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.core.Readiness
import com.safehaven.app.ui.ReadinessState
import com.safehaven.app.ui.ScreenTitle
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.rememberReadiness
import com.safehaven.app.ui.theme.StatusColors
import com.safehaven.app.ui.vm.SetupViewModel

/** First-run setup, and the "Permissions and readiness" screen reachable later. */
@Composable
fun SetupScreen(onDone: () -> Unit, vm: SetupViewModel = viewModel()) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    var name by remember { mutableStateOf("") }
    LaunchedEffect(settings.userName) { if (name.isEmpty()) name = settings.userName }
    val readiness = rememberReadiness()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ScreenTitle("Set up SafeHaven")
        Text(
            "SafeHaven can send your location to people you trust when you press SOS. " +
                "It needs a few permissions to do that. Nothing is sent until you press SOS or send a test message.",
            style = MaterialTheme.typography.bodyLarge,
        )

        SectionCard {
            Text("Your name", style = MaterialTheme.typography.titleMedium)
            Text(
                "Your contacts will see this in the alert message.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                singleLine = true,
                label = { Text("Name shown to contacts") },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        PermissionsSection(readiness)

        Button(
            onClick = { vm.saveAndFinish(name, onDone) },
            enabled = name.isNotBlank(),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
        ) { Text("Done") }
        if (!readiness.current().allGood) {
            Text(
                "You can finish now, but SOS cannot alert your contacts until SMS is allowed.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Permission rows with an Allow button each. Re-checks whenever the app resumes. */
@Composable
fun PermissionsSection(readiness: ReadinessState) {
    val context = LocalContext.current
    val r = readiness.current()
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        readiness.refresh()
    }

    fun openAppSettings() {
        context.startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")),
        )
    }

    SectionCard {
        Text("Permissions", style = MaterialTheme.typography.titleMedium)

        PermissionRow(
            title = "Location",
            why = "Includes your position in alerts.",
            granted = r.anyLocation,
            onAllow = {
                launcher.launch(
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                )
            },
            onSettings = ::openAppSettings,
        )
        PermissionRow(
            title = "Send SMS",
            why = "Sends the alert text to your contacts. Your carrier's normal SMS rates apply.",
            granted = r.sms,
            onAllow = { launcher.launch(arrayOf(Manifest.permission.SEND_SMS)) },
            onSettings = ::openAppSettings,
        )
        if (Build.VERSION.SDK_INT >= 33) {
            PermissionRow(
                title = "Notifications",
                why = "Shows that an SOS is active.",
                granted = r.notifications,
                onAllow = { launcher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS)) },
                onSettings = ::openAppSettings,
            )
        }

        if (!r.telephony) {
            Text(
                "This device cannot send SMS. SOS will still be recorded, but you will have to message contacts yourself.",
                style = MaterialTheme.typography.bodyMedium,
                color = StatusColors.danger(),
            )
        }
        if (!r.locationServicesOn) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = StatusColors.warning())
                Text("Location is switched off on this phone.", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = { context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)) }) {
                    Text("Turn on")
                }
            }
        }
        OutlinedButton(
            onClick = { context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Check battery optimisation") }
        Text(
            "Some phones stop background apps aggressively. Set SafeHaven to \"Not optimised\" so an active SOS keeps running.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun PermissionRow(
    title: String,
    why: String,
    granted: Boolean,
    onAllow: () -> Unit,
    onSettings: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(
            imageVector = if (granted) Icons.Default.CheckCircle else Icons.Default.Warning,
            contentDescription = if (granted) "Allowed" else "Not allowed",
            tint = if (granted) StatusColors.success() else StatusColors.warning(),
        )
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(why, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (!granted) {
            Column(horizontalAlignment = Alignment.End) {
                Button(onClick = onAllow) { Text("Allow") }
                TextButton(onClick = onSettings) { Text("App settings") }
            }
        }
    }
}

/** Convenience for screens that only need to know whether everything is ready. */
fun Readiness.problems(): List<String> = buildList {
    if (!smsReady) add(if (!telephony) "This device cannot send SMS" else "SMS permission needed")
    if (!anyLocation) add("Location permission needed")
    if (anyLocation && !locationServicesOn) add("Location is switched off")
}
