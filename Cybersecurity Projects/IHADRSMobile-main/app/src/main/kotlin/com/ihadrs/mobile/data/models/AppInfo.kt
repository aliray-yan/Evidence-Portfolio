package com.ihadrs.mobile.data.models

data class AppInfo(
    val packageName: String,
    val appName: String,
    val versionName: String?,
    val installTime: Long,
    val updateTime: Long,
    val requestedPermissions: List<String> = emptyList(),
    val riskScore: Int = 0,
    val fromUnknownSource: Boolean = false,
    val systemApp: Boolean = false
)
