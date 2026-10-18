package com.ihadrs.mobile.data.models

enum class AttributionConfidence { HIGH, MEDIUM, LOW, UNKNOWN }
enum class FlowProtocol { TCP, UDP, ICMP, OTHER }
enum class FlowNetworkType { WIFI, MOBILE, VPN, UNKNOWN }
enum class FlowVerdict { CLEAN, SUSPICIOUS, HIGH_RISK, MALICIOUS, UNKNOWN }

data class NetworkFlow(
    val id: String,
    val timestampStart: Long,
    val timestampEnd: Long,
    val appPackage: String?,
    val appName: String?,
    val appUid: Int?,
    val attributionConfidence: AttributionConfidence,
    val destinationIp: String,
    val destinationDomain: String?,
    val destinationPort: Int?,
    val protocol: FlowProtocol,
    val bytesSent: Long,
    val bytesReceived: Long,
    val packetsSent: Int,
    val packetsReceived: Int,
    val networkType: FlowNetworkType,
    val country: String?,
    val asn: String?,
    val riskScore: Int,
    val verdict: FlowVerdict,
    val reasons: List<String>
)

data class DnsCacheEntry(
    val domain: String,
    val ipAddress: String,
    val firstSeen: Long,
    val lastSeen: Long
)

data class FlowAlertEvidence(
    val alertId: String,
    val title: String,
    val severity: String,
    val flow: NetworkFlow,
    val evidenceSummary: String,
    val recommendedActions: List<String>
)
