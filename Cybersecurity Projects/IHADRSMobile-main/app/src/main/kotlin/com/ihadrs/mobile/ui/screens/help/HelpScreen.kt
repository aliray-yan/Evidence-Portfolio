package com.ihadrs.mobile.ui.screens.help

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ihadrs.mobile.ui.components.InfoPanel
import com.ihadrs.mobile.ui.components.PageHeader
import com.ihadrs.mobile.ui.components.SectionTitle
import com.ihadrs.mobile.ui.theme.IhadrsMuted

@Composable
fun HelpScreen(padding: PaddingValues) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "Manual",
                subtitle = "Plain-language guide to what IHADRS does, what alerts mean, and what is still limited"
            )
        }
        item {
            HelpPanel(
                "Start Here",
                listOf(
                    "Dashboard gives the quick health score.",
                    "Integrity checks risky Android settings: root indicators, Accessibility, Device Admin, VPN apps, and location access.",
                    "Network shows endpoint checks, simulated flow detections, and the future VPN flow monitor area.",
                    "Threats shows active alerts that need review.",
                    "Apps lets you mark apps Trusted, Watch, or Blocked.",
                    "Settings controls permissions, theme, SOC export, and network-flow options."
                )
            )
        }
        item {
            HelpPanel(
                "What Alerts Mean",
                listOf(
                    "Low: useful information or weak signal.",
                    "Medium: review soon; could be risky depending on context.",
                    "High: take action, especially if the app is unknown.",
                    "Critical: possible compromise indicator; review immediately.",
                    "Every alert should show reasons and recommended actions."
                )
            )
        }
        item {
            HelpPanel(
                "Simulation Data",
                listOf(
                    "Flow Simulation creates fake examples so you can test the UI safely.",
                    "Domains ending in .example and IPs like 203.0.113.x, 198.51.100.x, and 192.0.2.x are test/documentation addresses.",
                    "Simulation alerts are not proof your phone is infected.",
                    "If the same suspicious entries appear without running simulation, then investigate."
                )
            )
        }
        item {
            HelpPanel(
                "What IHADRS Does Correctly Now",
                listOf(
                    "Stores analysis locally unless SOC export is manually enabled.",
                    "Does not decrypt HTTPS, read messages, steal credentials, or hide monitoring.",
                    "Can scan installed apps and permissions.",
                    "Can check SMS links if SMS permission is granted.",
                    "Can run Integrity scans for common spyware/root/backdoor indicators.",
                    "Can send alerts to SecureOps only when you enable SOC export."
                )
            )
        }
        item {
            HelpPanel(
                "Current Limits",
                listOf(
                    "The real VPN packet forwarding loop is scaffolded but not active yet.",
                    "Kernel-level, firmware-level, or highly privileged implants may evade normal Android apps.",
                    "Encrypted traffic to trusted CDNs can be hard to classify without behavior history.",
                    "No app can guarantee total protection on a fully compromised phone."
                )
            )
        }
        item {
            InfoPanel {
                SectionTitle("Emergency Security Steps")
                Text("If you strongly suspect compromise:", fontWeight = FontWeight.SemiBold)
                Text("- Change Google and important passwords from a trusted device.")
                Text("- Enable 2FA.")
                Text("- Review Accessibility, Device Admin, VPN, Location, and unknown apps.")
                Text("- Back up important files.")
                Text("- Consider factory reset and firmware update if root/tamper indicators appear.", color = IhadrsMuted)
            }
        }
    }
}

@Composable
private fun HelpPanel(title: String, lines: List<String>) {
    InfoPanel {
        SectionTitle(title)
        lines.forEach { line -> Text("- $line", color = IhadrsMuted) }
    }
}
