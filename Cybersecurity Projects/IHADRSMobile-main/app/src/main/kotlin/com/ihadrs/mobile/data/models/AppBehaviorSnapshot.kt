package com.ihadrs.mobile.data.models

data class AppBehaviorSnapshot(
    val id: String,
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
