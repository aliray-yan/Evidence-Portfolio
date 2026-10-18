package com.ihadrs.mobile.domain.usecases.networkflow

import com.ihadrs.mobile.data.models.AttributionConfidence
import com.ihadrs.mobile.data.models.FlowNetworkType
import com.ihadrs.mobile.data.models.FlowProtocol
import com.ihadrs.mobile.data.models.FlowVerdict
import com.ihadrs.mobile.data.models.NetworkFlow
import com.ihadrs.mobile.data.repository.FlowRepository
import java.util.UUID
import javax.inject.Inject

class NetworkFlowSimulationUseCase @Inject constructor(
    private val flowRepository: FlowRepository
) {
    suspend operator fun invoke(): Int {
        val now = System.currentTimeMillis()
        flowRepository.saveDnsAnswer("www.google.com", "142.250.190.36", now)
        flowRepository.saveDnsAnswer("mmg.whatsapp.net", "157.240.229.60", now)
        flowRepository.saveDnsAnswer("malicious-update.example", "203.0.113.45", now)
        val flows = listOf(
            flow(now, "com.google.android.gms", "Google Play services", "142.250.190.36", "www.google.com", 443, 20_000, 240_000),
            flow(now + 1_000, "com.whatsapp", "WhatsApp", "157.240.229.60", "mmg.whatsapp.net", 443, 40_000, 380_000),
            flow(now + 2_000, "com.unknown.recorder", "Screen Recorder", "198.51.100.23", null, 443, 42_000_000, 100_000),
            flow(now + 3_000, "com.unknown.recorder", "Screen Recorder", "203.0.113.45", "malicious-update.example", 4444, 5_000_000, 50_000),
            flow(now + 4_000, "com.chat.free", "Free Chat", "192.0.2.66", "xj92kq8zzp13x.example", 8080, 2_000_000, 25_000),
        ) + List(5) { index ->
            flow(
                now + 60_000L * index,
                "com.beacon.test",
                "Beacon Test",
                "203.0.113.45",
                "bad-c2.example",
                9001,
                10_000,
                2_000
            )
        }
        flowRepository.saveSimulatedFlows(flows)
        return flows.size
    }

    private fun flow(
        timestamp: Long,
        appPackage: String,
        appName: String,
        ip: String,
        domain: String?,
        port: Int,
        bytesSent: Long,
        bytesReceived: Long
    ): NetworkFlow =
        NetworkFlow(
            id = UUID.randomUUID().toString(),
            timestampStart = timestamp,
            timestampEnd = timestamp + 2_000,
            appPackage = appPackage,
            appName = appName,
            appUid = null,
            attributionConfidence = AttributionConfidence.MEDIUM,
            destinationIp = ip,
            destinationDomain = domain,
            destinationPort = port,
            protocol = FlowProtocol.TCP,
            bytesSent = bytesSent,
            bytesReceived = bytesReceived,
            packetsSent = (bytesSent / 1400L).coerceAtLeast(1).toInt(),
            packetsReceived = (bytesReceived / 1400L).coerceAtLeast(1).toInt(),
            networkType = FlowNetworkType.WIFI,
            country = null,
            asn = null,
            riskScore = 0,
            verdict = FlowVerdict.UNKNOWN,
            reasons = emptyList()
        )
}
