package com.ihadrs.mobile.detection.networkflow

import android.content.Context
import com.ihadrs.mobile.R
import com.ihadrs.mobile.data.models.NetworkFlow
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

data class FlowIocMatch(
    val type: String,
    val value: String,
    val reason: String
)

data class ThreatIntelSnapshot(
    val maliciousDomains: Set<String>,
    val maliciousIps: Set<String>,
    val suspiciousAsns: Set<String>,
    val suspiciousPorts: Set<Int>,
    val allowlistDomains: Set<String>,
    val allowlistApps: Set<String>
)

@Singleton
class ThreatIntelMatcher @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val snapshot: ThreatIntelSnapshot by lazy {
        ThreatIntelSnapshot(
            maliciousDomains = readRawLines(R.raw.malicious_domains),
            maliciousIps = readRawLines(R.raw.malicious_ips),
            suspiciousAsns = readRawLines(R.raw.suspicious_asns),
            suspiciousPorts = readRawLines(R.raw.suspicious_ports)
                .mapNotNull { it.toIntOrNull() }
                .toSet()
                .ifEmpty { DEFAULT_SUSPICIOUS_PORTS },
            allowlistDomains = readRawLines(R.raw.allowlist_domains),
            allowlistApps = readRawLines(R.raw.allowlist_apps)
        )
    }

    fun snapshot(): ThreatIntelSnapshot = snapshot

    fun match(flow: NetworkFlow): List<FlowIocMatch> {
        val domain = flow.destinationDomain?.lowercase()
        val ip = flow.destinationIp
        val asn = flow.asn.orEmpty()
        return buildList {
            if (domain != null && domain in snapshot.maliciousDomains) {
                add(FlowIocMatch("domain", domain, "destination domain matches local IOC list"))
            }
            if (ip in snapshot.maliciousIps) {
                add(FlowIocMatch("ip", ip, "destination IP matches local IOC list"))
            }
            if (asn.isNotBlank() && asn in snapshot.suspiciousAsns) {
                add(FlowIocMatch("asn", asn, "destination ASN is locally marked suspicious"))
            }
            if (flow.destinationPort != null && flow.destinationPort in snapshot.suspiciousPorts) {
                add(FlowIocMatch("port", flow.destinationPort.toString(), "destination port is commonly abused"))
            }
        }
    }

    fun isAllowlisted(flow: NetworkFlow): Boolean {
        val domain = flow.destinationDomain?.lowercase()
        val app = flow.appPackage.orEmpty()
        return app in snapshot.allowlistApps ||
            domain != null && snapshot.allowlistDomains.any { domain == it || domain.endsWith(".$it") }
    }

    private fun readRawLines(resourceId: Int): Set<String> =
        runCatching {
            context.resources.openRawResource(resourceId).bufferedReader().useLines { lines ->
                lines.map { it.trim().lowercase() }
                    .filter { it.isNotBlank() && !it.startsWith("#") }
                    .toSet()
            }
        }.getOrDefault(emptySet())

    private companion object {
        val DEFAULT_SUSPICIOUS_PORTS = setOf(23, 2323, 4444, 5555, 6667, 9001, 1337, 3389, 5900, 8080)
    }
}
