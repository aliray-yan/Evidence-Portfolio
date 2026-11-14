package com.safehaven.app.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.ui.ScreenTitle
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.vm.SettingsViewModel

@Composable
fun SettingsScreen(onOpenSetup: () -> Unit, vm: SettingsViewModel = viewModel()) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    var name by remember { mutableStateOf("") }
    var number by remember { mutableStateOf("") }
    var hold by remember(settings.holdMillis) { mutableFloatStateOf(settings.holdMillis.toFloat()) }
    LaunchedEffect(settings.userName) { if (name.isEmpty()) name = settings.userName }
    LaunchedEffect(settings.emergencyNumber) { if (number.isEmpty()) number = settings.emergencyNumber }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ScreenTitle("Settings")

        SectionCard {
            Text("Your name", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(onClick = { vm.setName(name) }, enabled = name.isNotBlank() && name.trim() != settings.userName) {
                Text("Save name")
            }
        }

        SectionCard {
            Text("Sending an SOS", style = MaterialTheme.typography.titleMedium)
            Text("Hold time: ${"%.1f".format(hold / 1000f)} s", style = MaterialTheme.typography.bodyMedium)
            Slider(
                value = hold,
                onValueChange = { hold = it },
                onValueChangeFinished = { vm.setHoldMillis(hold.toInt()) },
                valueRange = 1000f..3000f,
                steps = 3,
            )
            Text("Time to cancel after holding", style = MaterialTheme.typography.bodyMedium)
            ChipRow(
                options = listOf(0 to "Send at once", 3 to "3 s", 5 to "5 s", 10 to "10 s"),
                selected = settings.countdownSeconds,
                onSelect = vm::setCountdown,
            )
        }

        SectionCard {
            Text("During an SOS", style = MaterialTheme.typography.titleMedium)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Silent mode", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "No sound or vibration, and a plain notification that is hidden on the lock screen.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(checked = settings.silentMode, onCheckedChange = vm::setSilent)
            }
            Text("Send my location again every", style = MaterialTheme.typography.bodyMedium)
            ChipRow(
                options = listOf(0 to "Never", 2 to "2 min", 5 to "5 min", 10 to "10 min", 15 to "15 min"),
                selected = settings.updateIntervalMinutes,
                onSelect = vm::setInterval,
            )
            Text(
                "Each update is a real text message to every contact who got the first alert.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Tell contacts when I end the SOS", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Stops them worrying or travelling after you are safe.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(checked = settings.notifyOnResolve, onCheckedChange = vm::setNotifyOnResolve)
            }
        }

        SectionCard {
            Text("Emergency number", style = MaterialTheme.typography.titleMedium)
            Text(
                "Opened in your dialer from the SOS screen. Pakistan: police 15, Rescue 1122.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = number,
                onValueChange = { number = it },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(
                onClick = { vm.setEmergencyNumber(number) },
                enabled = number.isNotBlank() && number != settings.emergencyNumber,
            ) { Text("Save number") }
        }

        Button(onClick = onOpenSetup, modifier = Modifier.fillMaxWidth()) { Text("Permissions and readiness") }

        SectionCard {
            Text("What this version can and cannot do", style = MaterialTheme.typography.titleMedium)
            Text(
                "Alerts go out as ordinary text messages from this phone, so they need a SIM with credit and " +
                    "mobile signal. The app reports \"delivered\" only when the recipient's phone confirms it, " +
                    "and many networks do not send that confirmation. " +
                    "It does not contact police or ambulance services. " +
                    "Push notifications, secure expiring location links and account sync need the SafeHaven server, " +
                    "which is not part of this version.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun ChipRow(options: List<Pair<Int, String>>, selected: Int, onSelect: (Int) -> Unit) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { (value, label) ->
            FilterChip(
                selected = selected == value,
                onClick = { onSelect(value) },
                label = { Text(label) },
            )
        }
    }
}
