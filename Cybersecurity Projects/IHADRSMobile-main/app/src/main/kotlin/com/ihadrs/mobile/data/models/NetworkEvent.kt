package com.ihadrs.mobile.data.models

data class NetworkEvent(
    val id: String,
    val host: String,
    val ipAddress: String?,
    val port: Int?,
    val protocol: String,
    val timestamp: Long,
    val suspicious: Boolean = false,
    val riskScore: Int = 0,
    val reasons: List<String> = emptyList()
)
