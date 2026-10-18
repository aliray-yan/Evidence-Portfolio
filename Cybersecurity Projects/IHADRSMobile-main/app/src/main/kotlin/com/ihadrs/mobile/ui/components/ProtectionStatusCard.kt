package com.ihadrs.mobile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.ihadrs.mobile.ui.theme.IhadrsGreen
import com.ihadrs.mobile.ui.theme.IhadrsMuted
import com.ihadrs.mobile.ui.theme.IhadrsRed

@Composable
fun ProtectionStatusCard(active: Boolean) {
    InfoPanel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (active) "Protection Active" else "Protection Paused",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                if (active) "LIVE" else "OFF",
                color = if (active) IhadrsGreen else IhadrsRed,
                fontWeight = FontWeight.Bold
            )
        }
        Text(
            if (active) "App, SMS, and local indicator monitoring are ready." else "Start monitoring to enable live protection.",
            color = IhadrsMuted
        )
    }
}
