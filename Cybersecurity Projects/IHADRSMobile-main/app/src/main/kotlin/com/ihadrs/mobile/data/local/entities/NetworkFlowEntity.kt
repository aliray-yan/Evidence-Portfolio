package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "network_flows",
    indices = [
        Index("timestampStart"),
        Index("appPackage"),
        Index("destinationIp"),
        Index("destinationDomain"),
        Index("riskScore")
    ]
)
data class NetworkFlowEntity(
    @PrimaryKey val id: String,
    val timestampStart: Long,
    val timestampEnd: Long,
    val appPackage: String?,
    val appName: String?,
    val appUid: Int?,
    val attributionConfidence: String,
    val destinationIp: String,
    val destinationDomain: String?,
    val destinationPort: Int?,
    val protocol: String,
    val bytesSent: Long,
    val bytesReceived: Long,
    val packetsSent: Int,
    val packetsReceived: Int,
    val networkType: String,
    val country: String?,
    val asn: String?,
    val riskScore: Int,
    val verdict: String,
    val reasons: List<String>
)
