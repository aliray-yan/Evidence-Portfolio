package com.ihadrs.mobile.domain.usecases.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.repository.NetworkRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.detection.analyzers.NetworkAnalyzer
import com.ihadrs.mobile.detection.intel.UrlNormalizer
import com.ihadrs.mobile.detection.intel.UrlThreatIntel
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.UUID
import javax.inject.Inject

data class NetworkPosture(
    val connected: Boolean,
    val transport: String,
    val vpnActive: Boolean,
    val validated: Boolean,
    val captivePortal: Boolean,
    val metered: Boolean,
    val riskScore: Int,
    val findings: List<String>,
    val recommendations: List<String>
)

data class EndpointAnalysisResult(
    val event: NetworkEvent?,
    val alertCreated: Boolean,
    val message: String
)

class AnalyzeNetworkUseCase @Inject constructor(
    @ApplicationContext private val context: Context,
    private val networkRepository: NetworkRepository,
    private val threatRepository: ThreatRepository,
    private val urlThreatIntel: UrlThreatIntel,
    private val networkAnalyzer: NetworkAnalyzer
) {
    fun inspectPosture(): NetworkPosture {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = activeNetwork?.let(connectivityManager::getNetworkCapabilities)
        val connected = capabilities != null
        val vpnActive = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
        val wifi = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val cellular = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
        val ethernet = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true
        val validated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
        } else {
            connected
        }
        val captivePortal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL) == true
        } else {
            false
        }
        val metered = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true
        val findings = buildList {
            if (!connected) add("No active network detected")
            if (connected && !validated) add("Network is not validated by Android")
            if (captivePortal) add("Captive portal is present")
            if (!vpnActive) add("No VPN transport is active")
            if (metered) add("Connection is metered")
        }
        val riskScore = listOf(
            if (!connected) 25 else 0,
            if (connected && !validated) 25 else 0,
            if (captivePortal) 20 else 0,
            if (!vpnActive) 10 else 0,
            if (metered) 5 else 0
        ).sum().coerceIn(0, 100)
        return NetworkPosture(
            connected = connected,
            transport = when {
                vpnActive -> "VPN"
                wifi -> "Wi-Fi"
                cellular -> "Cellular"
                ethernet -> "Ethernet"
                connected -> "Other"
                else -> "Offline"
            },
            vpnActive = vpnActive,
            validated = validated,
            captivePortal = captivePortal,
            metered = metered,
            riskScore = riskScore,
            findings = findings.ifEmpty { listOf("Network posture looks normal") },
            recommendations = buildList {
                if (!vpnActive) add("Use a trusted VPN on untrusted Wi-Fi when handling sensitive accounts.")
                if (captivePortal || !validated) add("Avoid sign-ins until the network is validated and the captive portal is cleared.")
                if (metered) add("Keep background scans controlled on metered networks.")
                if (connected) add("Check suspicious links or domains before opening them.")
            }
        )
    }

    suspend fun analyzeEndpoint(input: String): EndpointAnalysisResult {
        val normalized = UrlNormalizer.normalize(input)
            ?: return EndpointAnalysisResult(null, alertCreated = false, message = "Enter a valid domain or URL.")
        val intel = urlThreatIntel.evaluate(listOf(normalized.normalized))
        val heuristicSuspicious = networkAnalyzer.isSuspicious(normalized.normalized)
        val heuristicReasons = if (heuristicSuspicious) {
            listOf("endpoint matches local network heuristic")
        } else {
            emptyList()
        }
        val score = (intel.score + if (heuristicSuspicious) 15 else 0).coerceIn(0, 100)
        val reasons = (intel.reasons + heuristicReasons).distinct()
        val suspicious = score >= 45
        val event = networkRepository.record(
            host = normalized.host,
            protocol = normalized.normalized.substringBefore("://").uppercase(),
            suspicious = suspicious,
            riskScore = score,
            reasons = reasons.ifEmpty { listOf("no local indicator matched") },
            port = if (normalized.normalized.startsWith("https://")) 443 else 80
        )
        val alertCreated = score >= 65
        if (alertCreated) {
            threatRepository.report(
                ThreatEvent(
                    id = UUID.randomUUID().toString(),
                    title = "Suspicious network endpoint",
                    description = "${normalized.host} scored $score/100 during local endpoint intelligence analysis.",
                    severity = when {
                        score >= 85 -> Severity.HIGH
                        score >= 65 -> Severity.MEDIUM
                        else -> Severity.LOW
                    },
                    category = AttackCategory.NETWORK_ATTACK,
                    timestamp = System.currentTimeMillis(),
                    triggeredRules = listOf("NET-IOC-001"),
                    mitreTechniques = listOf("MOBILE-NETWORK-IOC"),
                    remediation = listOf(
                        "Do not open the endpoint until you trust the source.",
                        "Check whether the link came from SMS, email, or an unknown app.",
                        "Use the incident view to correlate this endpoint with recent app and message events."
                    )
                )
            )
        }
        return EndpointAnalysisResult(
            event = event,
            alertCreated = alertCreated,
            message = if (alertCreated) {
                "Endpoint checked and an alert was created."
            } else {
                "Endpoint checked and saved to network history."
            }
        )
    }
}
