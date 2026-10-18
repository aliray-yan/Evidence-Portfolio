package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "network_events")
data class NetworkEventEntity(
    @PrimaryKey val id: String,
    val host: String,
    val ipAddress: String?,
    val port: Int?,
    val protocol: String,
    val timestamp: Long,
    val suspicious: Boolean,
    val riskScore: Int = 0,
    val reasons: List<String> = emptyList()
)
