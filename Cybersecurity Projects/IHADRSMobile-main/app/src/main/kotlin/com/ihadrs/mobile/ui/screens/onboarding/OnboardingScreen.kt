package com.ihadrs.mobile.ui.screens.onboarding

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun OnboardingScreen(
    padding: PaddingValues,
    onFinished: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel()
) {
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }
    val smsPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    Column(
        modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        PageHeader(
            title = "IHADRS Mobile",
            subtitle = "Privacy-first Android threat detection"
        )
        InfoPanel {
            Text("What it does", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Text("Scans installed apps, watches local threat signals, checks suspicious SMS links, and explains every finding.", color = IhadrsMuted)
        }
        InfoPanel {
            SectionTitle("Local by design")
            Text("Detection data stays on this device. Reports are generated locally and shared only when you choose.", color = IhadrsMuted)
        }
        InfoPanel {
            SectionTitle("Optional permissions")
            Text("Notifications help show urgent alerts. SMS access enables phishing checks for incoming messages.", color = IhadrsMuted)
            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            ) {
                Text("Allow Threat Notifications")
            }
            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    smsPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.RECEIVE_SMS,
                            Manifest.permission.READ_SMS
                        )
                    )
                }
            ) {
                Text("Allow SMS Protection")
            }
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                viewModel.complete()
                onFinished()
            }
        ) {
            Text("Enter Dashboard")
        }
    }
}
