package com.ihadrs.mobile.monitoring.networkflow

import com.ihadrs.mobile.data.models.FlowProtocol
import java.net.InetAddress
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.inject.Inject

data class ParsedPacket(
    val sourceIp: String,
    val sourcePort: Int?,
    val destinationIp: String,
    val destinationPort: Int?,
    val protocol: FlowProtocol,
    val packetSize: Int,
    val timestamp: Long,
    val dnsQuery: String? = null,
    val tlsSni: String? = null
)

class PacketParser @Inject constructor() {
    fun parse(packet: ByteArray, timestamp: Long = System.currentTimeMillis()): ParsedPacket? {
        if (packet.isEmpty()) return null
        val version = (packet[0].toInt() ushr 4) and 0x0F
        return when (version) {
            4 -> parseIpv4(packet, timestamp)
            6 -> parseIpv6(packet, timestamp)
            else -> null
        }
    }

    private fun parseIpv4(packet: ByteArray, timestamp: Long): ParsedPacket? {
        if (packet.size < 20) return null
        val ihl = (packet[0].toInt() and 0x0F) * 4
        if (packet.size < ihl + 4) return null
        val protocolNumber = packet[9].toInt() and 0xFF
        val sourceIp = InetAddress.getByAddress(packet.copyOfRange(12, 16)).hostAddress ?: return null
        val destinationIp = InetAddress.getByAddress(packet.copyOfRange(16, 20)).hostAddress ?: return null
        return parseTransport(packet, ihl, protocolNumber, sourceIp, destinationIp, timestamp)
    }

    private fun parseIpv6(packet: ByteArray, timestamp: Long): ParsedPacket? {
        if (packet.size < 40) return null
        val nextHeader = packet[6].toInt() and 0xFF
        val sourceIp = InetAddress.getByAddress(packet.copyOfRange(8, 24)).hostAddress ?: return null
        val destinationIp = InetAddress.getByAddress(packet.copyOfRange(24, 40)).hostAddress ?: return null
        return parseTransport(packet, 40, nextHeader, sourceIp, destinationIp, timestamp)
    }

    private fun parseTransport(
        packet: ByteArray,
        offset: Int,
        protocolNumber: Int,
        sourceIp: String,
        destinationIp: String,
        timestamp: Long
    ): ParsedPacket? {
        val protocol = when (protocolNumber) {
            1, 58 -> FlowProtocol.ICMP
            6 -> FlowProtocol.TCP
            17 -> FlowProtocol.UDP
            else -> FlowProtocol.OTHER
        }
        if (protocol !in setOf(FlowProtocol.TCP, FlowProtocol.UDP)) {
            return ParsedPacket(sourceIp, null, destinationIp, null, protocol, packet.size, timestamp)
        }
        if (packet.size < offset + 4) return null
        val buffer = ByteBuffer.wrap(packet).order(ByteOrder.BIG_ENDIAN)
        val sourcePort = buffer.getShort(offset).toInt() and 0xFFFF
        val destinationPort = buffer.getShort(offset + 2).toInt() and 0xFFFF
        val dnsQuery = if (protocol == FlowProtocol.UDP && (sourcePort == 53 || destinationPort == 53)) {
            parseDnsQuery(packet.copyOfRange(offset + 8, packet.size))
        } else {
            null
        }
        return ParsedPacket(
            sourceIp = sourceIp,
            sourcePort = sourcePort,
            destinationIp = destinationIp,
            destinationPort = destinationPort,
            protocol = protocol,
            packetSize = packet.size,
            timestamp = timestamp,
            dnsQuery = dnsQuery,
            tlsSni = null
        )
    }

    fun parseDnsQuery(payload: ByteArray): String? {
        if (payload.size < 13) return null
        val questionCount = ByteBuffer.wrap(payload, 4, 2).order(ByteOrder.BIG_ENDIAN).short.toInt() and 0xFFFF
        if (questionCount <= 0) return null
        var index = 12
        val labels = mutableListOf<String>()
        while (index < payload.size) {
            val length = payload[index].toInt() and 0xFF
            if (length == 0) break
            index++
            if (index + length > payload.size) return null
            labels += payload.copyOfRange(index, index + length).toString(Charsets.UTF_8)
            index += length
        }
        return labels.joinToString(".").takeIf { it.isNotBlank() }
    }
}
