package com.safehaven.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safehaven.app.data.db.ContactEntity
import com.safehaven.app.data.repo.ContactsRepository
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.emergency.EmergencyDispatcher
import com.safehaven.app.ui.ScreenTitle
import com.safehaven.app.ui.SectionCard
import com.safehaven.app.ui.StatusPill
import com.safehaven.app.ui.theme.StatusColors
import com.safehaven.app.ui.vm.ContactsViewModel
import kotlinx.coroutines.launch

@Composable
fun ContactsScreen(vm: ContactsViewModel = viewModel()) {
    val contacts by vm.contacts.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var editing by remember { mutableStateOf<ContactEntity?>(null) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<ContactEntity?>(null) }
    var testing by remember { mutableStateOf<ContactEntity?>(null) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(top = 12.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Column {
                    ScreenTitle("Trusted contacts")
                    Text(
                        "These people get a text message with your location when you send an SOS. " +
                            "They do not need the app.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            if (contacts.isEmpty()) {
                item {
                    SectionCard {
                        Text("No contacts yet", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Add at least one person you trust. Send them a test message so you know their number works.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
            items(contacts, key = { it.id }) { contact ->
                ContactCard(
                    contact = contact,
                    onToggle = { vm.setEnabled(contact.id, it) },
                    onEdit = { editing = contact },
                    onDelete = { deleting = contact },
                    onTest = { testing = contact },
                )
            }
        }
        ExtendedFloatingActionButton(
            onClick = { adding = true },
            icon = { Icon(Icons.Default.Add, contentDescription = null) },
            text = { Text("Add contact") },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
        )
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }

    if (adding || editing != null) {
        ContactDialog(
            initial = editing,
            onDismiss = {
                adding = false
                editing = null
            },
            onSave = { name, phone, relationship ->
                val result = vm.save(editing?.id, name, phone, relationship)
                if (result is ContactsRepository.SaveResult.Saved) {
                    adding = false
                    editing = null
                    null
                } else {
                    (result as ContactsRepository.SaveResult.Invalid).message
                }
            },
        )
    }

    deleting?.let { contact ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Remove ${contact.name}?") },
            text = { Text("They will no longer be alerted. Past incidents keep their record.") },
            confirmButton = {
                TextButton(onClick = {
                    vm.delete(contact.id)
                    deleting = null
                }) { Text("Remove") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep") } },
        )
    }

    testing?.let { contact ->
        AlertDialog(
            onDismissRequest = { testing = null },
            title = { Text("Send a test message?") },
            text = {
                Text(
                    "${contact.name} (${contact.phoneNumber}) will get one real text message saying they were added " +
                        "as your emergency contact. Your carrier's SMS rates apply.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    testing = null
                    scope.launch {
                        val message = when (vm.sendTest(contact.id)) {
                            EmergencyDispatcher.TestResult.REQUESTED -> "Test message handed to the network."
                            EmergencyDispatcher.TestResult.NO_PERMISSION ->
                                "SMS permission is needed. Open Settings, then Permissions."
                            EmergencyDispatcher.TestResult.NO_TELEPHONY -> "This device cannot send SMS."
                            EmergencyDispatcher.TestResult.NOT_FOUND -> "That contact no longer exists."
                        }
                        snackbar.showSnackbar(message)
                    }
                }) { Text("Send") }
            },
            dismissButton = { TextButton(onClick = { testing = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun ContactCard(
    contact: ContactEntity,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onTest: () -> Unit,
) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Column(Modifier.weight(1f)) {
                Text(contact.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    listOf(contact.phoneNumber, contact.relationship).filter { it.isNotBlank() }.joinToString("  |  "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = contact.enabled,
                onCheckedChange = onToggle,
            )
        }
        val (label, color) = when (contact.lastTestStatus) {
            null -> "Not tested" to StatusColors.neutral()
            DeliveryStatus.DELIVERED -> "Test delivered" to StatusColors.success()
            DeliveryStatus.FAILED -> "Last test failed" to StatusColors.danger()
            else -> "Test sent, delivery unconfirmed" to StatusColors.warning()
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            StatusPill(label, color)
            Box(Modifier.weight(1f))
            TextButton(onClick = onTest, enabled = contact.enabled) { Text("Send test") }
            IconButton(onClick = onEdit) { Icon(Icons.Default.Edit, contentDescription = "Edit ${contact.name}") }
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "Remove ${contact.name}") }
        }
        if (!contact.enabled) {
            Text(
                "Switched off: this person will not be alerted.",
                style = MaterialTheme.typography.bodySmall,
                color = StatusColors.warning(),
            )
        }
    }
}

@Composable
private fun ContactDialog(
    initial: ContactEntity?,
    onDismiss: () -> Unit,
    onSave: suspend (name: String, phone: String, relationship: String) -> String?,
) {
    var name by remember { mutableStateOf(initial?.name ?: "") }
    var phone by remember { mutableStateOf(initial?.phoneNumber ?: "") }
    var relationship by remember { mutableStateOf(initial?.relationship ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "Add trusted contact" else "Edit contact") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone number") },
                    supportingText = { Text("Include the country code, e.g. +92 300 1234567") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
                OutlinedTextField(
                    value = relationship,
                    onValueChange = { relationship = it },
                    label = { Text("Relationship (optional)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                )
                error?.let { Text(it, color = StatusColors.danger(), style = MaterialTheme.typography.bodyMedium) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                scope.launch { error = onSave(name, phone, relationship) }
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
