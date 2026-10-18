package com.ihadrs.mobile.detection.networkflow

import com.ihadrs.mobile.data.models.AttributionConfidence
import com.ihadrs.mobile.data.models.FlowNetworkType
import com.ihadrs.mobile.data.models.FlowProtocol
import com.ihadrs.mobile.data.models.FlowVerdict
import com.ihadrs.mobile.data.models.NetworkFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NetworkFlowDetectionRulesEngineTest {
    private val engine = NetworkFlowDetectionRulesEngine()

    @Test
    fun evaluate_scoresRawIpAndSuspiciousPortAsHighRisk() {
        val flow = flow(domain = null, port = 4444, bytesSent = 30L * 1024L * 1024L)

        val result = engine.evaluate(flow, FlowDetectionContext())

        assertTrue(result.riskScore >= 51)
        assertEquals(FlowVerdict.HIGH_RISK, result.verdict)
        assertTrue(result.reasons.any { it.contains("raw external IP") })
    }

    @Test
    fun evaluate_iocMatchCanBecomeMalicious() {
        val flow = flow(domain = "bad-c2.example", port = 443)

        val result = engine.evaluate(
            flow,
            FlowDetectionContext(iocMatches = listOf(FlowIocMatch("domain", "bad-c2.example", "destination domain matches local IOC list")))
        )

        assertTrue(result.riskScore >= 70)
    }

    @Test
    fun dgaAndBeaconingHelpers_work() {
        assertTrue("xj92kq8zzp13x.example".looksDgaLike())
        val now = 1_000L
        val flows = List(4) { index -> flow(timestamp = now + index * 60_000L, domain = "bad-c2.example", port = 443) }
        assertTrue(flows.hasBeaconingPattern())
    }

    private fun flow(
        timestamp: Long = 1_000L,
        domain: String?,
        port: Int,
        bytesSent: Long = 1_000L
    ): NetworkFlow =
        NetworkFlow(
            id = timestamp.toString(),
            timestampStart = timestamp,
            timestampEnd = timestamp + 500,
            appPackage = "example.app",
            appName = "Example",
            appUid = 10001,
            attributionConfidence = AttributionConfidence.MEDIUM,
            destinationIp = "203.0.113.45",
            destinationDomain = domain,
            destinationPort = port,
            protocol = FlowProtocol.TCP,
            bytesSent = bytesSent,
            bytesReceived = 100,
            packetsSent = 1,
            packetsReceived = 1,
            networkType = FlowNetworkType.WIFI,
            country = null,
            asn = null,
            riskScore = 0,
            verdict = FlowVerdict.UNKNOWN,
            reasons = emptyList()
        )
}
