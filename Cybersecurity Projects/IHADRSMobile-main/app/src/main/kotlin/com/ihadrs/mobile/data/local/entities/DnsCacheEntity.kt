package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "dns_cache",
    primaryKeys = ["domain", "ipAddress"],
    indices = [Index("ipAddress"), Index("lastSeen")]
)
data class DnsCacheEntity(
    val domain: String,
    val ipAddress: String,
    val firstSeen: Long,
    val lastSeen: Long
)
