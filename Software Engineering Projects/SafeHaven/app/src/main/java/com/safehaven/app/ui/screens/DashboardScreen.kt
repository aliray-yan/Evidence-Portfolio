package com.safehaven.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.ui.ScreenTitle
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.SosButton
import com.safehaven.app.ui.StatusPill
import com.safehaven.app.ui.color
import com.safehaven.app.ui.formatDateTime
import com.safehaven.app.ui.label
import com.safehaven.app.ui.rememberReadiness
import com.safehaven.app.ui.theme.EmergencyRed
import com.safehaven.app.ui.theme.StatusColors
import com.safehaven.app.ui.vm.DashboardViewModel
import com.safehaven.app.ui.vm.SosViewModel
import kotlinx.coroutines.delay

private enum class ActivationWarning { NO_CONTACTS, SMS_NOT_READY }

@Composable
fun DashboardScreen(
    onOpenSetup: () -> Unit,
    onOpenContacts: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenIncident: (String) -> Unit,
    onStartCountdown: (Int) -> Unit,
    vm: DashboardViewModel = viewModel(),
    sos: SosViewModel = viewModel(),
) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    val contactCount by vm.enabledContactCount.collectAsStateWithLifecycle()
    val lastIncident by vm.lastIncident.collectAsStateWithLifecycle()
    val readiness = rememberReadiness()
    val r = readiness.current()
    var warning by remember { mutableStateOf<ActivationWarning?>(null) }

    fun proceed() {
        if (settings.countdownSeconds > 0) onStartCountdown(settings.countdownSeconds) else sos.activate()
    }

    fun onSosHeld() {
        when {
            contactCount == 0 -> warning = ActivationWarning.NO_CONTACTS
            !r.smsReady -> warning = ActivationWarning.SMS_NOT_READY
            else -> proceed()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ScreenTitle("SafeHaven", Modifier.fillMaxWidth())

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusTile(
                    "Contacts",
                    when (contactCount) {
                        null -> "Loading"
                        0 -> "None added"
                        1 -> "1 ready"
                        else -> "$contactCount ready"
                    },
                    ok = (contactCount ?: 1) > 0,
                    modifier = Modifier.weight(1f),
                    onClick = onOpenContacts,
                )
                StatusTile(
                    "SMS",
                    when {
                        !r.telephony -> "Not supported"
                        !r.sms -> "Permission needed"
                        else -> "Ready"
                    },
                    ok = r.smsReady,
                    modifier = Modifier.weight(1f),
                    onClick = onOpenSetup,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusTile(
                    "Location",
                    when {
                        !r.anyLocation -> "Permission needed"
                        !r.locationServicesOn -> "Switched off"
                        else -> "Ready"
                    },
                    ok = r.anyLocation && r.locationServicesOn,
                    modifier = Modifier.weight(1f),
                    onClick = onOpenSetup,
                )
                StatusTile(
                    "Internet",
                    if (r.online) "Online" else "Offline (SMS still works)",
                    ok = true,
                    modifier = Modifier.weight(1f),
                    onClick = null,
                )
            }
        }

        Box(Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            SosButton(holdMillis = settings.holdMillis, onActivate = ::onSosHeld)
        }
        Text(
            text = "Hold for ${"%.1f".format(settings.holdMillis / 1000f)} seconds. " +
                if (settings.countdownSeconds > 0) "You will have ${settings.countdownSeconds} seconds to cancel."
                else "The alert is sent immediately.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        lastIncident?.let { incident ->
            SectionCard(Modifier.clickable { onOpenIncident(incident.id) }) {
                Text("Last SOS", style = MaterialTheme.typography.titleMedium)
                Text(formatDateTime(incident.activatedAt), style = MaterialTheme.typography.bodyMedium)
                StatusPill(incident.status.label(), incident.status.color())
            }
            TextButton(onClick = onOpenHistory) { Text("View all incidents") }
        }
    }

    warning?.let { w ->
        val noContacts = w == ActivationWarning.NO_CONTACTS
        AlertDialog(
            onDismissRequest = { warning = null },
            title = { Text(if (noContacts) "No trusted contacts yet" else "SMS is not ready") },
            text = {
                Text(
                    if (noContacts) {
                        "Nobody would receive your alert. Add a contact first. " +
                            "You can still record the SOS on this phone if you choose to continue."
                    } else {
                        "SafeHaven cannot send text messages right now, so your contacts would not be alerted. " +
                            "You can fix it now, or continue and message them yourself from the next screen."
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    warning = null
                    if (noContacts) onOpenContacts() else onOpenSetup()
                }) { Text(if (noContacts) "Add a contact" else "Fix now") }
            },
            dismissButton = {
                TextButton(onClick = {
                    warning = null
                    proceed()
                }) { Text("Continue anyway") }
            },
        )
    }
}

@Composable
private fun StatusTile(
    title: String,
    value: String,
    ok: Boolean,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)?,
) {
    val tint = if (ok) StatusColors.success() else StatusColors.warning()
    val base = modifier
    Surface(
        modifier = if (onClick != null) base.clickable(onClick = onClick) else base,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(
                imageVector = if (ok) Icons.Default.CheckCircle else Icons.Default.Warning,
                contentDescription = if (ok) "OK" else "Needs attention",
                tint = tint,
            )
            Column {
                Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** Full-screen cancel window shown after the SOS button has been held. */
@Composable
fun CountdownScreen(seconds: Int, onCancel: () -> Unit, sos: SosViewModel = viewModel()) {
    var remaining by remember { mutableIntStateOf(seconds) }
    var sent by remember { mutableStateOf(false) }
    BackHandler(onBack = onCancel)

    fun sendNow() {
        if (!sent) {
            sent = true
            sos.activate()
        }
    }

    LaunchedEffect(Unit) {
        while (remaining > 0) {
            delay(1000)
            remaining -= 1
        }
        sendNow()
    }

    Surface(modifier = Modifier.fillMaxSize(), color = EmergencyRed, contentColor = Color.White) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Sending SOS in", fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            Text("$remaining", fontSize = 120.sp, fontWeight = FontWeight.ExtraBold)
            Text(
                "Your trusted contacts will be alerted with your location.",
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyLarge,
            )
            Button(
                onClick = onCancel,
                enabled = !sent,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = EmergencyRed),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 40.dp),
            ) {
                Text("CANCEL", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 10.dp))
            }
            TextButton(onClick = ::sendNow, enabled = !sent) {
                Text("Send now", color = Color.White, fontSize = 18.sp)
            }
        }
    }
}
