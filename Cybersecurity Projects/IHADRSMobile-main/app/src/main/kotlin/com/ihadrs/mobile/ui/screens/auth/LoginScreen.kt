package com.ihadrs.mobile.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun LoginScreen(
    padding: PaddingValues,
    onAuthenticated: () -> Unit,
    viewModel: AuthViewModel
) {
    val prefs by viewModel.preferences.collectAsState()
    val message by viewModel.message.collectAsState()
    val setupMode = prefs.authPasswordHash.isBlank()
    var username by remember { mutableStateOf(prefs.authUsername) }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PageHeader(
            title = if (setupMode) "Create Login" else "Login",
            subtitle = if (setupMode) "Protect local IHADRS findings on this phone" else "Unlock IHADRS Mobile"
        )
        InfoPanel {
            Text(
                text = if (setupMode) {
                    "Create a local username and password. This stays on the device."
                } else {
                    "Enter your local credentials to continue."
                },
                color = IhadrsMuted
            )
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                singleLine = true
            )
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation()
            )
            if (setupMode) {
                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("Confirm password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation()
                )
            }
            message?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    if (setupMode) {
                        viewModel.createLogin(username, password, confirmPassword)
                    } else {
                        viewModel.login(username, password)
                    }
                }
            ) {
                Text(if (setupMode) "Create Login" else "Login")
            }
        }
    }

    val authenticated by viewModel.authenticated.collectAsState()
    LaunchedEffect(authenticated) {
        if (authenticated) onAuthenticated()
    }
}
