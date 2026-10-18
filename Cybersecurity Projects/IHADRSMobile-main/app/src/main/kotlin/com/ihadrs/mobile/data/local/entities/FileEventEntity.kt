package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "file_events")
data class FileEventEntity(
    @PrimaryKey val id: String,
    val path: String,
    val eventType: String,
    val timestamp: Long,
    val suspicious: Boolean
)
