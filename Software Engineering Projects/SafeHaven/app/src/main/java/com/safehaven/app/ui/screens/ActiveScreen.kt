package com.safehaven.app.ui.screens

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.data.db.IncidentEntity
import com.safehaven.app.data.db.NotificationEventEntity
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.domain.EventKind
import com.safehaven.app.domain.MessageBuilder
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.StatusPill
import com.safehaven.app.ui.color
import com.safehaven.app.ui.detail
import com.safehaven.app.ui.explanation
import com.safehaven.app.ui.formatAge
import com.safehaven.app.ui.label
import com.safehaven.app.ui.rememberReadiness
import com.safehaven.app.ui.theme.StatusColors
import com.safehaven.app.ui.vm.ActiveViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ActiveScreen(onOpenSetup: () -> Unit, vm: ActiveViewModel = viewModel()) {
    val incident by vm.incident.collectAsStateWithLifecycle()
    val events by vm.events.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val readiness = rememberReadiness()
    val now by produceState(initialValue = System.currentTimeMillis()) {
        while (true) {
            delay(1000)
            value = System.currentTimeMillis()
        }
    }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var confirmEnd by remember { mutableStateOf(false) }

    val current = incident ?: return
    val r = readiness.current()
    val alerts = events.filter { it.kind == EventKind.INITIAL }
    val anyFailed = alerts.any { it.status == DeliveryStatus.FAILED }

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionCard(containerColor = MaterialTheme.colorScheme.errorContainer) {
                Text(
                    "SOS ACTIVE",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
                StatusPill(current.status.label(), current.status.color())
                Text(
                    current.status.explanation(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
                current.statusDetail?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = StatusColors.danger())
                }
                Text(
                    "Started ${formatAge(now - current.activatedAt)}  |  Ref ${MessageBuilder.shortId(current.id)}" +
                        if (current.silent) "  |  Silent mode" else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
            }
        }

        item {
            LocationCard(
                incident = current,
                now = now,
                hasPermission = r.anyLocation,
                servicesOn = r.locationServicesOn,
                onFixPermission = onOpenSetup,
                onOpenLocationSettings = { context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)) },
                onOpenMap = { openMap(context, current) },
            )
        }

        item {
            Text("Your contacts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        if (alerts.isEmpty()) {
            item {
                SectionCard {
                    Text(
                        "No contacts were alerted. Add a trusted contact and SafeHaven will alert them straight away.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    TextButton(onClick = onOpenSetup) { Text("Check setup") }
                }
            }
        }
        items(alerts, key = { it.id }) { event ->
            AlertRow(
                event = event,
                onMessageManually = {
                    scope.launch {
                        val intent = vm.manualSmsIntent(event)
                        if (intent != null) {
                            try {
                                context.startActivity(intent)
                            } catch (e: ActivityNotFoundException) {
                                // No SMS app installed; nothing more we can do here.
                            }
                        }
                    }
                },
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (anyFailed || alerts.any { it.status == DeliveryStatus.PENDING }) {
                    Button(onClick = vm::retryNow, modifier = Modifier.fillMaxWidth()) { Text("Retry sending now") }
                }
                OutlinedButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${settings.emergencyNumber}")))
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Call ${settings.emergencyNumber} (opens the dialer)") }
                Text(
                    "SafeHaven does not contact police or ambulance services. Call them yourself if you can.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = { confirmEnd = true },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                ) { Text("I'm safe. End SOS", modifier = Modifier.padding(vertical = 8.dp)) }
            }
        }
    }

    if (confirmEnd) {
        AlertDialog(
            onDismissRequest = { confirmEnd = false },
            title = { Text("End this SOS?") },
            text = {
                Text(
                    if (settings.notifyOnResolve) {
                        "Location sharing stops, and contacts who received your alert are told that you ended it."
                    } else {
                        "Location sharing stops. Your contacts will not be told that you ended it."
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmEnd = false
                    vm.endSos()
                }) { Text("End SOS") }
            },
            dismissButton = { TextButton(onClick = { confirmEnd = false }) { Text("Keep it active") } },
        )
    }
}

@Composable
private fun LocationCard(
    incident: IncidentEntity,
    now: Long,
    hasPermission: Boolean,
    servicesOn: Boolean,
    onFixPermission: () -> Unit,
    onOpenLocationSettings: () -> Unit,
    onOpenMap: () -> Unit,
) {
    SectionCard {
        Text("Your location", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        val fix = incident.lastFix()
        when {
            !hasPermission -> {
                Text(
                    "Location permission is not granted, so your alert has no coordinates.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = StatusColors.danger(),
                )
                TextButton(onClick = onFixPermission) { Text("Allow location") }
            }
            !servicesOn && fix == null -> {
                Text(
                    "Location is switched off on this phone.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = StatusColors.danger(),
                )
                TextButton(onClick = onOpenLocationSettings) { Text("Turn on location") }
            }
            fix == null -> {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 3.dp)
                    Text("Waiting for a GPS fix. Go outdoors or near a window if you can.", style = MaterialTheme.typography.bodyMedium)
                }
            }
            else -> {
                Text(
                    "%.5f, %.5f".format(java.util.Locale.US, fix.latitude, fix.longitude),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                val accuracy = fix.accuracyM?.let { "accuracy about ${it.toInt()} m, " } ?: ""
                Text(
                    "$accuracy updated ${formatAge(now - fix.timeMs)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (!servicesOn) {
                    Text(
                        "Location was switched off, so this may be out of date.",
                        style = MaterialTheme.typography.bodySmall,
                        color = StatusColors.warning(),
                    )
                    TextButton(onClick = onOpenLocationSettings) { Text("Turn on location") }
                }
                OutlinedButton(onClick = onOpenMap) { Text("Open in Maps") }
            }
        }
    }
}

@Composable
private fun AlertRow(event: NotificationEventEntity, onMessageManually: () -> Unit) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(event.recipientName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            StatusPill(event.status.label(), event.status.color())
        }
        Text(event.detail(), style = MaterialTheme.typography.bodyMedium)
        if (event.status == DeliveryStatus.FAILED) {
            OutlinedButton(onClick = onMessageManually) { Text("Message them in my SMS app") }
        }
    }
}

private fun openMap(context: Context, incident: IncidentEntity) {
    val fix = incident.lastFix() ?: return
    val geo = Uri.parse("geo:${fix.latitude},${fix.longitude}?q=${fix.latitude},${fix.longitude}(SOS)")
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, geo))
    } catch (e: ActivityNotFoundException) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(MessageBuilder.mapLink(fix.latitude, fix.longitude))))
    }
}
