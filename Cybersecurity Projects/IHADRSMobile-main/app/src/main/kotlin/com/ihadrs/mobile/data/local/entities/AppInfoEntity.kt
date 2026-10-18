package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "apps")
data class AppInfoEntity(
    @PrimaryKey val packageName: String,
    val appName: String,
    val versionName: String?,
    val installTime: Long,
    val updateTime: Long,
    val requestedPermissions: List<String>,
    val riskScore: Int,
    val fromUnknownSource: Boolean,
    val systemApp: Boolean
)
