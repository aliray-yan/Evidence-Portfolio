package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "soc_outbound_alerts")
data class SocOutboundAlertEntity(
    @PrimaryKey val alertId: String,
    val payloadJson: String,
    val status: String,
    val createdAt: Long,
    val lastAttemptAt: Long = 0L,
    val attempts: Int = 0,
    val lastError: String? = null,
    val secureOpsAlertIds: List<String> = emptyList()
)
