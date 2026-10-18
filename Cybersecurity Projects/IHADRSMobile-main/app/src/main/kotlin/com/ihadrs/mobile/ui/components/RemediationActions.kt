package com.ihadrs.mobile.ui.components

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

@Composable
fun RemediationActions(
    packageName: String?,
    systemApp: Boolean = false
) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (packageName != null) {
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = { context.openAppDetails(packageName) }
            ) {
                Text("Open App Settings")
            }
            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = { context.openAppNotificationSettings(packageName) }
            ) {
                Text("Open Notification Settings")
            }
            if (!systemApp) {
                OutlinedButton(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { context.uninstallPackage(packageName) }
                ) {
                    Text("Uninstall App")
                }
            }
        }
        OutlinedButton(
            modifier = Modifier.fillMaxWidth(),
            onClick = { context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }
        ) {
            Text("Open Battery Settings")
        }
    }
}

private fun Context.openAppDetails(packageName: String) {
    startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
}

private fun Context.openAppNotificationSettings(packageName: String) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
    } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:$packageName"))
    }
    startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

private fun Context.uninstallPackage(packageName: String) {
    startActivity(
        Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
}
