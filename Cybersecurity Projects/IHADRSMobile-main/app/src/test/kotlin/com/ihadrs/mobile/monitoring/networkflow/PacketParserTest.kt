package com.ihadrs.mobile.monitoring.networkflow

import com.ihadrs.mobile.data.models.FlowProtocol
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PacketParserTest {
    private val parser = PacketParser()

    @Test
    fun parseDnsQuery_extractsDomain() {
        val dnsPayload = byteArrayOf(
            0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x03, 'w'.code.toByte(), 'w'.code.toByte(), 'w'.code.toByte(),
            0x06, 'g'.code.toByte(), 'o'.code.toByte(), 'o'.code.toByte(), 'g'.code.toByte(), 'l'.code.toByte(), 'e'.code.toByte(),
            0x03, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(),
            0x00, 0x00, 0x01, 0x00, 0x01
        )

        assertEquals("www.google.com", parser.parseDnsQuery(dnsPayload))
    }

    @Test
    fun parseIpv4UdpPacket_extractsMetadata() {
        val packet = ByteArray(20 + 8)
        packet[0] = 0x45
        packet[9] = 17
        packet[12] = 10
        packet[13] = 0
        packet[14] = 0
        packet[15] = 2
        packet[16] = 8
        packet[17] = 8
        packet[18] = 8
        packet[19] = 8
        packet[20] = 0x30
        packet[21] = 0x39
        packet[22] = 0x00
        packet[23] = 0x35

        val parsed = parser.parse(packet)

        assertNotNull(parsed)
        assertEquals(FlowProtocol.UDP, parsed!!.protocol)
        assertEquals("10.0.0.2", parsed.sourceIp)
        assertEquals("8.8.8.8", parsed.destinationIp)
        assertEquals(12345, parsed.sourcePort)
        assertEquals(53, parsed.destinationPort)
    }
}
