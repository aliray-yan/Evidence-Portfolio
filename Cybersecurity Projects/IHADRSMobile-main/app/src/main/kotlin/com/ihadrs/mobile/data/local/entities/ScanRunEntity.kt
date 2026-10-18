package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scan_runs")
data class ScanRunEntity(
    @PrimaryKey val id: String,
    val startedAt: Long,
    val finishedAt: Long,
    val scannedApps: Int,
    val findings: Int,
    val status: String
)
