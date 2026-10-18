package com.ihadrs.mobile.detection.networkflow

import com.ihadrs.mobile.data.models.FlowVerdict
import com.ihadrs.mobile.data.models.NetworkFlow
import javax.inject.Inject
import kotlin.math.abs

data class FlowDetectionContext(
    val previousAppDomainFlows: List<NetworkFlow> = emptyList(),
    val recentAppFlows: List<NetworkFlow> = emptyList(),
    val appInstallTime: Long? = null,
    val appAllowlisted: Boolean = false,
    val trustedSystemService: Boolean = false,
    val iocMatches: List<FlowIocMatch> = emptyList(),
    val enableSuspiciousPorts: Boolean = true,
    val enableDgaDetection: Boolean = true,
    val enableIocMatching: Boolean = true,
    val baselineModeEnabled: Boolean = false
)

data class FlowDetectionResult(
    val riskScore: Int,
    val verdict: FlowVerdict,
    val reasons: List<String>
)

class NetworkFlowDetectionRulesEngine @Inject constructor() {
    fun evaluate(flow: NetworkFlow, context: FlowDetectionContext): FlowDetectionResult {
        val reasons = mutableListOf<String>()
        var score = 0

        if (context.enableIocMatching && context.iocMatches.any { it.type in setOf("domain", "ip") }) {
            score += 70
            reasons += context.iocMatches.map { it.reason }
        }
        if (context.enableSuspiciousPorts && flow.destinationPort in SUSPICIOUS_PORTS) {
            score += 20
            reasons += "destination port ${flow.destinationPort} is commonly used by malware, botnets, or remote access tools"
        }
        if (flow.destinationDomain == null && !flow.destinationIp.isPrivateIp()) {
            score += 20
            reasons += "app connected to a raw external IP without a recent DNS label"
        }
        if (flow.destinationDomain != null && context.previousAppDomainFlows.isEmpty()) {
            score += 10
            reasons += "app contacted a domain not previously seen for this app"
        }
        if (context.enableDgaDetection && flow.destinationDomain?.looksDgaLike() == true) {
            score += 25
            reasons += "destination domain looks random or DGA-like"
        }
        if (context.recentAppFlows.size >= MANY_CONNECTIONS_THRESHOLD) {
            score += 20
            reasons += "app made many outbound connections in a short time window"
        }
        if (context.recentAppFlows.distinctBy { it.destinationIp }.size >= MANY_IPS_THRESHOLD) {
            score += 15
            reasons += "app contacted many different IPs quickly"
        }
        if (flow.bytesSent >= LARGE_UPLOAD_BYTES) {
            score += 25
            reasons += "large upload volume observed for this flow"
        }
        if (context.recentAppFlows.hasBeaconingPattern()) {
            score += 30
            reasons += "recent flows show a repeated fixed-interval beaconing pattern"
        }
        if (context.appInstallTime != null && flow.timestampStart - context.appInstallTime in 0..NEW_APP_WINDOW_MS) {
            score += 15
            reasons += "newly installed app sent network traffic soon after installation"
        }
        if (flow.destinationPort in RELAY_PORTS && flow.bytesReceived > 0 && flow.bytesSent > 0) {
            score += 15
            reasons += "flow resembles proxy, relay, or VPN-like behavior"
        }
        if (context.appAllowlisted) {
            score -= 35
            reasons += "app or domain is allowlisted, reducing score"
        }
        if (context.trustedSystemService) {
            score -= 20
            reasons += "known trusted system service, reducing score"
        }

        val normalized = score.coerceIn(0, 100)
        return FlowDetectionResult(
            riskScore = normalized,
            verdict = when {
                normalized >= 81 -> FlowVerdict.MALICIOUS
                normalized >= 51 -> FlowVerdict.HIGH_RISK
                normalized >= 21 -> FlowVerdict.SUSPICIOUS
                normalized >= 0 -> FlowVerdict.CLEAN
                else -> FlowVerdict.UNKNOWN
            },
            reasons = reasons.distinct().ifEmpty { listOf("no suspicious network metadata rule matched") }
        )
    }

    companion object {
        val SUSPICIOUS_PORTS = setOf(23, 2323, 4444, 5555, 6667, 9001, 1337, 3389, 5900, 8080)
        private val RELAY_PORTS = setOf(1080, 3128, 4444, 5555, 8080, 9001)
        private const val MANY_CONNECTIONS_THRESHOLD = 20
        private const val MANY_IPS_THRESHOLD = 10
        private const val LARGE_UPLOAD_BYTES = 25L * 1024L * 1024L
        private const val NEW_APP_WINDOW_MS = 24L * 60L * 60L * 1000L
    }
}

fun List<NetworkFlow>.hasBeaconingPattern(): Boolean {
    if (size < 4) return false
    val sorted = sortedBy { it.timestampStart }
    val intervals = sorted.zipWithNext { left, right -> right.timestampStart - left.timestampStart }
        .filter { it in 10_000L..10 * 60_000L }
    if (intervals.size < 3) return false
    val average = intervals.average()
    return intervals.count { abs(it - average) <= 3_000L } >= 3
}

fun String.looksDgaLike(): Boolean {
    val host = substringBefore('.')
    if (host.length < 12) return false
    val vowels = host.count { it in "aeiou" }
    val digits = host.count { it.isDigit() }
    val consonantRuns = Regex("[bcdfghjklmnpqrstvwxyz]{5,}", RegexOption.IGNORE_CASE).containsMatchIn(host)
    return digits >= 4 || vowels <= 2 || consonantRuns
}

fun String.isPrivateIp(): Boolean =
    startsWith("10.") ||
        startsWith("192.168.") ||
        Regex("""172\.(1[6-9]|2\d|3[0-1])\..+""").matches(this) ||
        startsWith("127.") ||
        startsWith("::1") ||
        startsWith("fe80:")
