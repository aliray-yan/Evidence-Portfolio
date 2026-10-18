package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_behavior_snapshots")
data class AppBehaviorSnapshotEntity(
    @PrimaryKey val id: String,
    val packageName: String,
    val appName: String,
    val capturedAt: Long,
    val riskScore: Int,
    val permissionCount: Int,
    val sensitivePermissions: List<String>,
    val fromUnknownSource: Boolean,
    val systemApp: Boolean,
    val versionName: String?
)
