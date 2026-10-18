package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "timeline_events")
data class TimelineEventEntity(
    @PrimaryKey val id: String,
    val type: String,
    val title: String,
    val detail: String,
    val timestamp: Long,
    val packageName: String?,
    val threatId: String?,
    val severity: String?
)
