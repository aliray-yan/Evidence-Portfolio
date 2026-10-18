package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sms_events")
data class SmsEventEntity(
    @PrimaryKey val id: String,
    val sender: String,
    val bodyPreview: String,
    val timestamp: Long,
    val phishingScore: Int,
    val suspiciousLinks: List<String>
)
