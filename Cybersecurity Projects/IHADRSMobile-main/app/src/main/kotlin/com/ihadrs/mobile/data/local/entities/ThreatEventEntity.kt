package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "threat_events")
data class ThreatEventEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val packageName: String?,
    val severity: String,
    val category: String,
    val timestamp: Long,
    val triggeredRules: List<String>,
    val mitreTechniques: List<String>,
    val remediation: List<String>,
    val dismissed: Boolean
)
